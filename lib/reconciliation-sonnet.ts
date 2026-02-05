/**
 * Sonnet Reconciliation Module
 * 
 * Triggered when extraction confidence < 80%.
 * Re-extracts problematic sections with Claude Sonnet,
 * then merges/reconciles with original extraction.
 */

import { getAnthropicClientForUser, MODELS, trackUsage } from "@/lib/ai-clients";
import type { LineItem, UserSettings, ReconciliationResult, AIProvider } from "@/lib/types";

// =============================================================================
// MAIN RECONCILIATION FUNCTION
// =============================================================================

/**
 * Reconcile low-confidence extraction with Claude Sonnet
 * Returns improved extraction with higher confidence
 */
export async function reconcileWithSonnet(
  originalItems: LineItem[],
  originalConfidence: number,
  buffer: Buffer,
  filename: string,
  sourceText: string,
  userId: string,
  settings: UserSettings,
  log: string[],
  extractionRunId?: string
): Promise<ReconciliationResult> {
  const startTime = Date.now();
  log.push(`🔄 Starting Sonnet reconciliation (original confidence: ${(originalConfidence * 100).toFixed(0)}%)`);
  
  try {
    // Get Anthropic client (BYOK or system)
    const { client, isUserKey, provider } = await getAnthropicClientForUser(userId);
    log.push(`✓ Using ${isUserKey ? "user's" : "system"} Anthropic API key`);
    
    // Re-extract with Sonnet using the source text
    log.push(`📊 Re-extracting with Claude Sonnet...`);
    
    const reconciledResult = await reExtractWithSonnet(
      client,
      sourceText,
      originalItems,
      filename,
      settings
    );
    
    // Track usage
    const estimatedCost = calculateSonnetCost(
      reconciledResult.tokensUsed.input,
      reconciledResult.tokensUsed.output
    );
    await trackUsage(
      userId,
      extractionRunId || null,
      provider,
      MODELS.RECONCILIATION,
      reconciledResult.tokensUsed.input,
      reconciledResult.tokensUsed.output,
      estimatedCost
    );
    
    // Merge results: prefer Sonnet extraction but preserve original items if Sonnet missed them
    const mergedItems = mergeExtractions(originalItems, reconciledResult.items);
    
    // Calculate new confidence
    const newConfidence = calculateReconciliationConfidence(
      originalConfidence,
      reconciledResult.confidence,
      mergedItems.length,
      originalItems.length
    );
    
    const processingTime = Date.now() - startTime;
    const itemsReconciled = Math.abs(mergedItems.length - originalItems.length) + 
      countDifferentItems(originalItems, mergedItems);
    
    log.push(`✅ Reconciliation complete: ${mergedItems.length} items, ${(newConfidence * 100).toFixed(0)}% confidence`);
    log.push(`   Reconciled ${itemsReconciled} items (${mergedItems.length - originalItems.length >= 0 ? '+' : ''}${mergedItems.length - originalItems.length} net change)`);
    
    return {
      success: true,
      items: mergedItems,
      originalConfidence,
      newConfidence,
      itemsReconciled,
      processingTimeMs: processingTime,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`❌ Reconciliation failed: ${errorMsg}`);
    
    // Return original items on failure
    return {
      success: false,
      items: originalItems,
      originalConfidence,
      newConfidence: originalConfidence,
      itemsReconciled: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// RE-EXTRACTION WITH SONNET
// =============================================================================

interface SonnetExtractionResult {
  items: LineItem[];
  confidence: number;
  tokensUsed: { input: number; output: number };
}

/**
 * Re-extract data using Claude Sonnet with focus on accuracy
 */
async function reExtractWithSonnet(
  client: InstanceType<typeof import("@anthropic-ai/sdk").default>,
  sourceText: string,
  originalItems: LineItem[],
  filename: string,
  settings: UserSettings
): Promise<SonnetExtractionResult> {
  // Infer receiver from filename
  const receiver = inferReceiver(filename);
  
  // Build material synonyms
  const materialSynonyms = settings.material_synonyms
    ? Object.entries(settings.material_synonyms)
        .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
        .join("\n")
    : "";
  
  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const filenameDate = dateMatch ? dateMatch[0].replace(/[-_]/g, '-') : null;
  
  // Truncate source if too long
  const truncatedSource = sourceText.length > 80000 
    ? sourceText.substring(0, 80000) + "\n...[truncated]..."
    : sourceText;

  const prompt = `You are an expert document extraction agent performing a RECONCILIATION pass.

A previous extraction had low confidence. Your job is to carefully re-extract ALL data, 
paying special attention to accuracy and completeness.

═══════════════════════════════════════════════════════════════════════════════
ORIGINAL EXTRACTION (for reference - may contain errors)
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(originalItems.slice(0, 20), null, 2)}
${originalItems.length > 20 ? `\n... and ${originalItems.length - 20} more items` : ''}

═══════════════════════════════════════════════════════════════════════════════
SOURCE DOCUMENT
═══════════════════════════════════════════════════════════════════════════════
${truncatedSource}

═══════════════════════════════════════════════════════════════════════════════
RECONCILIATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════
1. Extract ALL rows from the source document
2. VERIFY each extraction against the source text
3. CORRECT any errors you see in the original extraction
4. ADD any missing rows
5. REMOVE any hallucinated/fabricated rows

Focus on:
- Accurate weight values (check units, avoid 10x errors)
- Correct dates (YYYY-MM-DD format)
- Real addresses from the document
- Material names that appear in source

═══════════════════════════════════════════════════════════════════════════════
MULTI-LANGUAGE SUPPORT
═══════════════════════════════════════════════════════════════════════════════
Document may be in: Swedish, Norwegian, Danish, Finnish, or English.

═══════════════════════════════════════════════════════════════════════════════
DATE HANDLING
═══════════════════════════════════════════════════════════════════════════════
- Period ranges → extract END DATE
- Output as YYYY-MM-DD
- Fallback: ${filenameDate || 'today'}

═══════════════════════════════════════════════════════════════════════════════
MATERIAL STANDARDIZATION
═══════════════════════════════════════════════════════════════════════════════
${materialSynonyms || 'Use material names as found in document.'}

═══════════════════════════════════════════════════════════════════════════════
WEIGHT (always in kg)
═══════════════════════════════════════════════════════════════════════════════
- ton/t → ×1000
- g/gram → ÷1000
- kg → as-is

${settings.custom_instructions ? `═══════════════════════════════════════════════════════════════════════════════
CUSTOM INSTRUCTIONS (HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════════════════
${settings.custom_instructions}
` : ''}
═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON only, no markdown)
═══════════════════════════════════════════════════════════════════════════════
{
  "items": [
    {"date":"2024-01-16","location":"Address","material":"Material","weightKg":185,"unit":"Kg","receiver":"${receiver}","isHazardous":false}
  ],
  "confidence": 0.95,
  "changes": ["Fixed weight error in row 3", "Added missing row for location X"]
}`;

  try {
    const response = await client.messages.create({
      model: MODELS.RECONCILIATION,
      max_tokens: 16384,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    });
    
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => 'text' in b ? b.text : '')
      .join('');
    
    const tokensUsed = {
      input: response.usage?.input_tokens || 0,
      output: response.usage?.output_tokens || 0,
    };
    
    // Parse JSON response
    const parsed = parseJsonResponse(text);
    
    if (!parsed || !parsed.items || !Array.isArray(parsed.items)) {
      return {
        items: [],
        confidence: 0,
        tokensUsed,
      };
    }
    
    // Normalize items
    const items: LineItem[] = (parsed.items as Record<string, unknown>[]).map(item => ({
      date: String(item.date || filenameDate || ""),
      location: String(item.location || item.address || ""),
      material: String(item.material || ""),
      weightKg: typeof item.weightKg === 'number' ? item.weightKg : parseFloat(String(item.weightKg)) || 0,
      unit: String(item.unit || "Kg"),
      receiver: String(item.receiver || receiver),
      isHazardous: Boolean(item.isHazardous),
    }));
    
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.90;
    
    return { items, confidence, tokensUsed };
    
  } catch (error) {
    return {
      items: [],
      confidence: 0,
      tokensUsed: { input: 0, output: 0 },
    };
  }
}

// =============================================================================
// MERGE LOGIC
// =============================================================================

/**
 * Merge original and reconciled extractions
 * Prefers reconciled items but keeps original items if they seem valid
 */
function mergeExtractions(
  originalItems: LineItem[],
  reconciledItems: LineItem[]
): LineItem[] {
  // If reconciliation failed or returned fewer items, use original
  if (reconciledItems.length === 0) {
    return originalItems;
  }
  
  // If reconciliation returned significantly more items, trust it
  if (reconciledItems.length > originalItems.length * 1.2) {
    return reconciledItems;
  }
  
  // Otherwise, prefer reconciled but check for missing items
  const merged = [...reconciledItems];
  
  // Find items in original that might be missing from reconciled
  for (const original of originalItems) {
    const hasMatch = reconciledItems.some(r => 
      r.date === original.date &&
      r.location === original.location &&
      r.material === original.material &&
      Math.abs(r.weightKg - original.weightKg) < 1 // Within 1kg
    );
    
    if (!hasMatch && original.weightKg > 0 && original.location) {
      // This item might have been missed, add it with lower confidence
      merged.push({
        ...original,
        confidence: 0.6, // Lower confidence since it wasn't in reconciled
      });
    }
  }
  
  return merged;
}

/**
 * Count how many items are different between two extractions
 */
function countDifferentItems(a: LineItem[], b: LineItem[]): number {
  let different = 0;
  
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const itemA = a[i];
    const itemB = b[i];
    
    if (
      itemA.date !== itemB.date ||
      itemA.location !== itemB.location ||
      itemA.material !== itemB.material ||
      Math.abs(itemA.weightKg - itemB.weightKg) > 1
    ) {
      different++;
    }
  }
  
  return different;
}

/**
 * Calculate new confidence after reconciliation
 */
function calculateReconciliationConfidence(
  originalConfidence: number,
  reconciledConfidence: number,
  mergedCount: number,
  originalCount: number
): number {
  // Weight reconciled confidence higher
  const baseConfidence = reconciledConfidence * 0.7 + originalConfidence * 0.3;
  
  // Bonus for finding more items
  const countBonus = mergedCount > originalCount ? 0.05 : 0;
  
  // Penalty for losing items
  const countPenalty = mergedCount < originalCount * 0.8 ? 0.1 : 0;
  
  return Math.min(0.95, Math.max(0, baseConfidence + countBonus - countPenalty));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse JSON response with fallbacks
 */
function parseJsonResponse(text: string): Record<string, unknown> | null {
  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/^[^{]+/, '')
    .replace(/[^}]+$/, '')
    .trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
    } catch {
      // Failed to parse
    }
  }
  
  return null;
}

/**
 * Infer receiver from filename
 */
function inferReceiver(filename: string): string {
  const fn = filename.toLowerCase();
  if (fn.includes('ragn-sells') || fn.includes('ragnsells')) return "Ragn-Sells";
  if (fn.includes('renova')) return "Renova";
  if (fn.includes('nsr')) return "NSR";
  if (fn.includes('stena')) return "Stena Recycling";
  if (fn.includes('suez')) return "Suez";
  return "Okänd mottagare";
}

/**
 * Calculate cost in USD (Sonnet pricing)
 * Input: $3/M tokens, Output: $15/M tokens
 */
function calculateSonnetCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
}
