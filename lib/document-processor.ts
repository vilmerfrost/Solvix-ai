/**
 * Document Processor - Main Orchestrator
 * 
 * Ties together the entire multi-model extraction pipeline:
 * 1. Quality Assessment (Gemini Flash)
 * 2. Route & Extract (Mistral OCR or Gemini Flash)
 * 3. Reconciliation (Sonnet) - if confidence < 80%
 * 4. Verification (Haiku) - ALWAYS ON
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { THRESHOLDS } from "@/lib/ai-clients";
import { assessDocumentQuality, routeDocument } from "@/lib/document-router";
import { extractWithGemini } from "@/lib/extraction-gemini";
import { extractWithMistral } from "@/lib/extraction-mistral";
import { verifyWithHaiku } from "@/lib/verification-haiku";
import { reconcileWithSonnet } from "@/lib/reconciliation-sonnet";
import type { 
  UserSettings, 
  DocumentProcessingResult, 
  QualityAssessment,
  VerificationResult,
  LineItem 
} from "@/lib/types";

// =============================================================================
// EXTRACTION RUN TRACKING
// =============================================================================

/**
 * Create a new extraction run record
 */
async function createExtractionRun(
  userId: string,
  documentId: string
): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("extraction_runs")
    .insert({
      user_id: userId,
      document_id: documentId,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("Failed to create extraction run:", error);
    return `temp-${Date.now()}`; // Fallback ID
  }
  
  return data.id;
}

/**
 * Update extraction run with intermediate results
 */
async function updateExtractionRun(
  runId: string,
  updates: Record<string, unknown>
): Promise<void> {
  if (runId.startsWith('temp-')) return; // Skip temp IDs
  
  const supabase = createServiceRoleClient();
  
  await supabase
    .from("extraction_runs")
    .update(updates)
    .eq("id", runId);
}

/**
 * Mark extraction run as completed
 */
async function completeExtractionRun(
  runId: string,
  modelPath: string,
  totalTokens: number,
  estimatedCostUSD: number
): Promise<void> {
  if (runId.startsWith('temp-')) return;
  
  const supabase = createServiceRoleClient();
  const startedAt = await getRunStartTime(runId);
  const durationMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
  
  await supabase
    .from("extraction_runs")
    .update({
      model_path: modelPath,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCostUSD.toFixed(6),
    })
    .eq("id", runId);
}

/**
 * Mark extraction run as failed
 */
async function failExtractionRun(
  runId: string,
  error: unknown
): Promise<void> {
  if (runId.startsWith('temp-')) return;
  
  const supabase = createServiceRoleClient();
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  await supabase
    .from("extraction_runs")
    .update({
      completed_at: new Date().toISOString(),
      extraction_result: { error: errorMsg },
    })
    .eq("id", runId);
}

/**
 * Get run start time for duration calculation
 */
async function getRunStartTime(runId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  
  const { data } = await supabase
    .from("extraction_runs")
    .select("started_at")
    .eq("id", runId)
    .single();
  
  return data?.started_at || null;
}

// =============================================================================
// MAIN DOCUMENT PROCESSOR
// =============================================================================

/**
 * Process a document through the multi-model extraction pipeline
 */
export async function processDocumentMultiModel(
  buffer: Buffer,
  filename: string,
  documentId: string,
  userId: string,
  settings: UserSettings
): Promise<DocumentProcessingResult> {
  const log: string[] = [];
  let modelPath = "";
  let totalTokens = 0;
  let totalCost = 0;
  
  // Create extraction run for tracking
  const runId = await createExtractionRun(userId, documentId);
  log.push(`📋 Created extraction run: ${runId}`);
  
  try {
    // =========================================================================
    // STEP 1: QUALITY ASSESSMENT
    // =========================================================================
    log.push(`\n🔍 STEP 1: Quality Assessment`);
    const assessment = await assessDocumentQuality(buffer, filename, userId);
    await updateExtractionRun(runId, { quality_assessment: assessment });
    
    log.push(`✓ Document type: ${assessment.documentType}`);
    log.push(`✓ Complexity: ${assessment.complexity}`);
    log.push(`✓ Recommended route: ${assessment.recommendedRoute}`);
    log.push(`✓ Reasoning: ${assessment.reasoning}`);
    
    // =========================================================================
    // STEP 2: ROUTE & EXTRACT
    // =========================================================================
    log.push(`\n📊 STEP 2: Route & Extract`);
    const route = routeDocument(assessment);
    
    let extractionResult;
    if (route === 'mistral-ocr' || assessment.documentType === 'pdf') {
      log.push(`→ Routing to Mistral OCR pipeline`);
      extractionResult = await extractWithMistral(buffer, filename, userId, settings, log, runId);
      modelPath = "mistral-ocr → mistral-large";
    } else {
      log.push(`→ Routing to Gemini Flash pipeline`);
      extractionResult = await extractWithGemini(buffer, filename, userId, settings, log, runId);
      modelPath = "gemini-3-flash";
    }
    
    await updateExtractionRun(runId, { extraction_result: {
      success: extractionResult.success,
      itemCount: extractionResult.items.length,
      confidence: extractionResult.confidence,
      model: extractionResult.model,
    }});
    
    totalTokens += extractionResult.tokensUsed.input + extractionResult.tokensUsed.output;
    totalCost += extractionResult.cost;
    
    if (!extractionResult.success) {
      throw new Error(extractionResult.error || "Extraction failed");
    }
    
    let items = extractionResult.items;
    let confidence = extractionResult.confidence;
    const sourceText = extractionResult.sourceText || "";
    const detectedDocumentType = extractionResult.documentType;
    const invoiceData = extractionResult.invoiceData;
    
    log.push(`✓ Extracted ${items.length} items (${(confidence * 100).toFixed(0)}% confidence)`);
    
    // =========================================================================
    // STEP 3: RECONCILIATION (if needed)
    // =========================================================================
    const enableReconciliation = settings.enable_reconciliation !== false;
    const reconciliationThreshold = settings.reconciliation_threshold || THRESHOLDS.RECONCILIATION_TRIGGER;
    
    if (enableReconciliation && confidence < reconciliationThreshold) {
      log.push(`\n🔄 STEP 3: Reconciliation (confidence ${(confidence * 100).toFixed(0)}% < ${(reconciliationThreshold * 100).toFixed(0)}%)`);
      
      const reconciliationResult = await reconcileWithSonnet(
        items,
        confidence,
        buffer,
        filename,
        sourceText,
        userId,
        settings,
        log,
        runId
      );
      
      await updateExtractionRun(runId, { reconciliation_result: {
        success: reconciliationResult.success,
        itemCount: reconciliationResult.items.length,
        originalConfidence: reconciliationResult.originalConfidence,
        newConfidence: reconciliationResult.newConfidence,
        itemsReconciled: reconciliationResult.itemsReconciled,
      }});
      
      if (reconciliationResult.success) {
        items = reconciliationResult.items;
        confidence = reconciliationResult.newConfidence;
        modelPath += " → sonnet-reconciliation";
        
        log.push(`✓ Reconciliation improved confidence to ${(confidence * 100).toFixed(0)}%`);
      }
    } else {
      log.push(`\n⏭️ STEP 3: Reconciliation skipped (confidence ${(confidence * 100).toFixed(0)}% >= ${(reconciliationThreshold * 100).toFixed(0)}%)`);
    }
    
    // =========================================================================
    // STEP 4: VERIFICATION (ALWAYS ON)
    // =========================================================================
    log.push(`\n🔍 STEP 4: Verification (ALWAYS ON)`);
    
    const verification = await verifyWithHaiku(items, sourceText, userId, log, runId);
    
    await updateExtractionRun(runId, { verification_result: {
      verified: verification.verified,
      confidence: verification.confidence,
      issueCount: verification.issues.length,
      itemsFlagged: verification.itemsFlagged,
    }});
    
    totalTokens += verification.processingTimeMs > 0 ? 1000 : 0; // Approximate
    modelPath += " → haiku-verification";
    
    log.push(`✓ Verification: ${verification.issues.length} issues found, ${verification.itemsFlagged} items flagged`);
    
    // =========================================================================
    // STEP 5: COMPLETE
    // =========================================================================
    log.push(`\n✅ STEP 5: Complete`);
    
    await completeExtractionRun(runId, modelPath, totalTokens, totalCost);
    
    log.push(`✓ Model path: ${modelPath}`);
    log.push(`✓ Total items: ${items.length}`);
    log.push(`✓ Final confidence: ${(confidence * 100).toFixed(0)}%`);
    log.push(`✓ Estimated cost: $${totalCost.toFixed(4)}`);
    
    return {
      success: true,
      items,
      confidence,
      verification,
      modelPath,
      log,
      runId,
      totalTokens,
      estimatedCostUSD: totalCost,
      documentType: detectedDocumentType,
      invoiceData,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`\n❌ ERROR: ${errorMsg}`);
    
    await failExtractionRun(runId, error);
    
    return {
      success: false,
      items: [],
      confidence: 0,
      modelPath,
      log,
      runId,
      totalTokens,
      estimatedCostUSD: totalCost,
    };
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { assessDocumentQuality, routeDocument };
