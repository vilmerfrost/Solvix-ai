/**
 * Core document processing function
 * Can be called directly from any route without HTTP requests
 * Supports both Excel and PDF files with model selection
 * 
 * NEW: Multi-model extraction pipeline with:
 * - Quality Assessment (Gemini Flash)
 * - PDF extraction (Mistral OCR → Mistral Large)
 * - Excel extraction (Gemini Flash)
 * - Reconciliation (Claude Sonnet) when confidence < 80%
 * - Verification (Claude Haiku) - ALWAYS ON
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { processDocumentMultiModel } from "@/lib/document-processor";
import type { 
  DocumentStatus, 
  ExtractedDocumentData, 
  UserSettings, 
} from "@/lib/types";

// Default settings when none exist
const DEFAULT_SETTINGS: Partial<UserSettings> = {
  auto_approve_threshold: 80,
  material_synonyms: {
    "Trä": ["Brädor", "Virke", "Lastpall", "Spont"],
    "Metall": ["Järn", "Stål", "Aluminium"],
    "Gips": ["Gipsplattor", "Gipsskivor"],
    "Betong": ["Cement", "Ballast"]
  }
};

// Settings with custom instructions extension
interface ProcessingSettings extends Partial<UserSettings> {
  custom_instructions?: string;
}

// Import settings getter
async function getSettings(userId: string): Promise<ProcessingSettings> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  return (data as ProcessingSettings) || DEFAULT_SETTINGS;
}

export interface ProcessResult {
  success: boolean;
  documentId: string;
  filename: string;
  status: DocumentStatus | string;
  error?: string;
  extractedData?: ExtractedDocumentData;
}

export interface ProcessOptions {
  modelId?: string;
  customInstructions?: string;
}

/**
 * Process a single document by ID
 */
export async function processDocument(
  documentId: string, 
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const supabase = createServiceRoleClient();
  
  console.log(`\n🔄 Processing document: ${documentId}`);
  if (options.modelId) console.log(`   Model: ${options.modelId}`);
  
  try {
    // Get document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (docError || !doc) {
      return {
        success: false,
        documentId,
        filename: "Unknown",
        status: "error",
        error: "Document not found"
      };
    }
    
    // Get settings
    const settings = await getSettings(doc.user_id);
    
    // Add custom instructions to settings if provided
    if (options.customInstructions) {
      settings.custom_instructions = options.customInstructions;
    }
    
    console.log(`   Filename: ${doc.filename}`);
    
    // Download file
    let arrayBuffer: ArrayBuffer;
    
    if (doc.url) {
      const response = await fetch(doc.url);
      arrayBuffer = await response.arrayBuffer();
    } else if (doc.storage_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("raw_documents")
        .download(doc.storage_path);
      
      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }
      
      arrayBuffer = await fileData.arrayBuffer();
    } else {
      throw new Error("No file URL or storage path found");
    }
    
    // Check file type
    const isExcel = doc.filename.match(/\.(xlsx|xls)$/i);
    const isPDF = doc.filename.match(/\.pdf$/i);
    
    if (!isExcel && !isPDF) {
      throw new Error(`Unsupported file type: ${doc.filename}`);
    }
    
    let extractedData: ExtractedDocumentData;
    
    // ALWAYS use the multi-model pipeline (correct orchestrator)
    // Pipeline: Gemini Flash (assess) → Mistral OCR (PDF) / Gemini (Excel) → Haiku (verify) → Sonnet (reconcile if <80%)
    console.log(`   🚀 Using multi-model extraction pipeline`);
    
    const multiModelResult = await processDocumentMultiModel(
      Buffer.from(arrayBuffer),
      doc.filename,
      doc.id,
      doc.user_id,
      settings as UserSettings
    );
    
    if (!multiModelResult.success) {
      throw new Error(multiModelResult.log.join('\n') || "Multi-model extraction failed");
    }
    
    // Transform result to ExtractedDocumentData format
    const totalWeight = multiModelResult.items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
    const uniqueAddresses = new Set(multiModelResult.items.map(item => item.location)).size;
    const uniqueMaterials = new Set(multiModelResult.items.map(item => item.material)).size;
    const uniqueReceivers = new Set(multiModelResult.items.map(item => item.receiver)).size;
    
    extractedData = {
      lineItems: multiModelResult.items,
      metadata: {
        totalRows: multiModelResult.items.length,
        extractedRows: multiModelResult.items.length,
        processedRows: multiModelResult.items.length,
        model: multiModelResult.modelPath,
        provider: 'multi-model',
        tokensUsed: { input: multiModelResult.totalTokens, output: 0 },
        cost: multiModelResult.estimatedCostUSD,
        confidence: multiModelResult.confidence,
      },
      totalWeightKg: totalWeight,
      totalCostSEK: multiModelResult.estimatedCostUSD * 10.5, // USD to SEK
      documentType: multiModelResult.documentType || "waste_report",
      // Store full invoice metadata if this is an invoice
      ...(multiModelResult.invoiceData ? { invoiceData: multiModelResult.invoiceData } : {}),
      uniqueAddresses,
      uniqueReceivers,
      uniqueMaterials,
      _validation: {
        completeness: multiModelResult.confidence * 100,
        confidence: multiModelResult.confidence * 100,
        issues: multiModelResult.verification?.issues.map(i => i.issue) || [],
      },
      _verification: multiModelResult.verification ? {
        verified: multiModelResult.verification.verified,
        verificationTime: multiModelResult.verification.processingTimeMs,
        hallucinations: multiModelResult.verification.issues.map(i => ({
          rowIndex: i.itemIndex,
          field: i.field,
          extracted: i.extractedValue as unknown,
          issue: i.issue,
          severity: i.severity as 'warning' | 'error',
        })),
      } : undefined,
      _processingLog: multiModelResult.log,
    };
    
    // Calculate quality score
    const completeness = extractedData._validation?.completeness || 0;
    const confidence = extractedData._validation?.confidence || completeness;
    const overallConfidence = extractedData.metadata?.confidence 
      ? extractedData.metadata.confidence * 100 
      : confidence;
    
    const qualityScore = (completeness + overallConfidence) / 2;
    const newStatus = qualityScore >= settings.auto_approve_threshold 
      ? "approved" 
      : "needs_review";
    
    // Generate AI summary
    const rowCount = extractedData.metadata?.processedRows || extractedData.lineItems?.length || 0;
    const aiSummary = completeness >= 95 && overallConfidence >= 90
      ? `✓ Dokument med ${rowCount} rader. Data komplett (${overallConfidence.toFixed(0)}% säkerhet).`
      : `⚠️ Dokument med ${rowCount} rader. ${overallConfidence.toFixed(0)}% säkerhet - behöver granskning.`;
    
    extractedData.aiSummary = aiSummary;
    
    // Save to database
    const { error: saveError } = await supabase
      .from("documents")
      .update({
        status: newStatus,
        extracted_data: extractedData,
        updated_at: new Date().toISOString()
      })
      .eq("id", doc.id);
    
    if (saveError) {
      throw new Error(`Failed to save: ${saveError.message}`);
    }
    
    console.log(`   ✅ Completed: ${newStatus} (${qualityScore.toFixed(0)}% quality)`);
    
    return {
      success: true,
      documentId: doc.id,
      filename: doc.filename,
      status: newStatus,
      extractedData
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    console.error(`   ❌ Processing error: ${errorMessage}`);
    
    // Update document to error status
    await supabase
      .from("documents")
      .update({
        status: "error",
        updated_at: new Date().toISOString(),
        extracted_data: {
          _error: errorMessage,
          _errorTimestamp: new Date().toISOString()
        }
      })
      .eq("id", documentId);
    
    return {
      success: false,
      documentId,
      filename: "Unknown",
      status: "error",
      error: errorMessage
    };
  }
}

/**
 * Process multiple documents sequentially
 */
export async function processBatch(
  documentIds: string[], 
  options: ProcessOptions = {}
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < documentIds.length; i++) {
    console.log(`\n📦 Batch progress: ${i + 1}/${documentIds.length}`);
    const result = await processDocument(documentIds[i], options);
    results.push(result);
  }
  
  return results;
}
