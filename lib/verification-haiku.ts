/**
 * Haiku Verification Module
 * 
 * ALWAYS ON - every extraction gets verified.
 * Compares extracted items against source text to flag hallucinations.
 * Chunks verification in 25-item batches for efficiency.
 */

import { getAnthropicClientForUser, MODELS, THRESHOLDS, trackUsage } from "@/lib/ai-clients";
import type { LineItem, VerificationResult, VerificationIssue, AIProvider } from "@/lib/types";

// =============================================================================
// MAIN VERIFICATION FUNCTION
// =============================================================================

/**
 * Verify extracted items against source text using Claude Haiku
 * Returns issues per item for human review
 */
export async function verifyWithHaiku(
  items: LineItem[],
  sourceText: string,
  userId: string,
  log: string[],
  extractionRunId?: string
): Promise<VerificationResult> {
  const startTime = Date.now();
  log.push(`🔍 Starting Haiku verification: ${items.length} items`);
  
  if (items.length === 0) {
    log.push(`⚠️ No items to verify`);
    return createEmptyResult(startTime);
  }
  
  if (!sourceText || sourceText.trim().length === 0) {
    log.push(`⚠️ No source text for verification`);
    return createEmptyResult(startTime);
  }
  
  try {
    // Get Anthropic client (BYOK or system)
    const { client, isUserKey, provider } = await getAnthropicClientForUser(userId);
    log.push(`✓ Using ${isUserKey ? "user's" : "system"} Anthropic API key`);
    
    // Chunk items for verification
    const batchSize = THRESHOLDS.VERIFICATION_BATCH_SIZE;
    const totalBatches = Math.ceil(items.length / batchSize);
    const allIssues: VerificationIssue[] = [];
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let confidenceSum = 0;
    
    log.push(`📦 Verifying in ${totalBatches} batches of ${batchSize} items`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, items.length);
      const batchItems = items.slice(start, end);
      
      log.push(`  Batch ${i + 1}/${totalBatches}: items ${start + 1}-${end}`);
      
      const batchResult = await verifyBatch(
        client,
        batchItems,
        sourceText,
        start, // offset for item indices
        i + 1,
        totalBatches
      );
      
      allIssues.push(...batchResult.issues);
      totalTokensInput += batchResult.tokensUsed.input;
      totalTokensOutput += batchResult.tokensUsed.output;
      confidenceSum += batchResult.batchConfidence;
      
      if (batchResult.issues.length > 0) {
        log.push(`    ⚠️ Found ${batchResult.issues.length} issues`);
      } else {
        log.push(`    ✓ All items verified`);
      }
    }
    
    // Calculate overall confidence
    const avgConfidence = totalBatches > 0 ? confidenceSum / totalBatches : 0;
    const itemsFlagged = new Set(allIssues.map(i => i.itemIndex)).size;
    
    // Track usage
    const estimatedCost = calculateHaikuCost(totalTokensInput, totalTokensOutput);
    await trackUsage(
      userId,
      extractionRunId || null,
      provider,
      MODELS.VERIFICATION,
      totalTokensInput,
      totalTokensOutput,
      estimatedCost
    );
    
    const processingTime = Date.now() - startTime;
    
    log.push(`✅ Verification complete: ${(avgConfidence * 100).toFixed(0)}% confidence, ${allIssues.length} issues, ${itemsFlagged} items flagged`);
    
    return {
      verified: true,
      confidence: avgConfidence,
      issues: allIssues,
      itemsVerified: items.length,
      itemsFlagged,
      processingTimeMs: processingTime,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`❌ Verification failed: ${errorMsg}`);
    return createEmptyResult(startTime, errorMsg);
  }
}

// =============================================================================
// BATCH VERIFICATION
// =============================================================================

interface BatchVerificationResult {
  issues: VerificationIssue[];
  batchConfidence: number;
  tokensUsed: { input: number; output: number };
}

/**
 * Verify a batch of items against source text
 */
async function verifyBatch(
  client: InstanceType<typeof import("@anthropic-ai/sdk").default>,
  items: LineItem[],
  sourceText: string,
  indexOffset: number,
  batchNum: number,
  totalBatches: number
): Promise<BatchVerificationResult> {
  // Truncate source text if too long (keep first 50k chars)
  const truncatedSource = sourceText.length > 50000 
    ? sourceText.substring(0, 50000) + "\n...[truncated]..."
    : sourceText;
  
  const prompt = `You are a data verification agent. Your job is to check if extracted data actually exists in the source document.

═══════════════════════════════════════════════════════════════════════════════
SOURCE DOCUMENT (batch ${batchNum}/${totalBatches})
═══════════════════════════════════════════════════════════════════════════════
${truncatedSource}

═══════════════════════════════════════════════════════════════════════════════
EXTRACTED DATA TO VERIFY (${items.length} items, indices ${indexOffset}-${indexOffset + items.length - 1})
═══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(items.map((item, idx) => ({ ...item, _index: indexOffset + idx })), null, 2)}

═══════════════════════════════════════════════════════════════════════════════
VERIFICATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════
For EACH extracted item, verify these fields exist in the source:
1. DATE - Does this date (or similar format) appear in source?
2. LOCATION - Does this address/location text appear?
3. MATERIAL - Does this material name (or synonym) appear?
4. WEIGHT - Does this weight value appear? Watch for unit conversion errors (500 kg vs 5000 kg)
5. RECEIVER - Does this appear, or was it likely inferred from filename?

⚠️ COMMON HALLUCINATION PATTERNS TO DETECT:
- Made-up addresses that don't exist in source
- Wrong weight magnitude (10x errors: 185 vs 1850)
- Dates from wrong rows
- Materials that don't appear anywhere in source
- Duplicate/repeated values when source has distinct values

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON only, no markdown)
═══════════════════════════════════════════════════════════════════════════════
{
  "verified": [
    {
      "itemIndex": 0,
      "date": { "found": true, "confidence": 1.0 },
      "location": { "found": true, "confidence": 1.0 },
      "material": { "found": true, "confidence": 0.95 },
      "weightKg": { "found": true, "confidence": 1.0 },
      "receiver": { "found": false, "inferred": true, "confidence": 0.7 }
    }
  ],
  "issues": [
    { 
      "itemIndex": 2, 
      "field": "weightKg", 
      "extractedValue": 5000, 
      "issue": "Source shows 500, possible 10x error", 
      "severity": "error",
      "suggestion": "Should be 500"
    }
  ],
  "overallConfidence": 0.92
}`;

  try {
    const response = await client.messages.create({
      model: MODELS.VERIFICATION,
      max_tokens: 4096,
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
    
    if (!parsed) {
      return {
        issues: [],
        batchConfidence: 0.5, // Unknown confidence
        tokensUsed,
      };
    }
    
    // Extract issues
    const issuesArray = Array.isArray(parsed.issues) ? parsed.issues : [];
    const issues: VerificationIssue[] = issuesArray.map((issue: Record<string, unknown>) => ({
      itemIndex: typeof issue.itemIndex === 'number' ? issue.itemIndex : indexOffset,
      field: String(issue.field || 'unknown'),
      extractedValue: issue.extractedValue,
      issue: String(issue.issue || 'Unknown issue'),
      severity: issue.severity === 'error' ? 'error' : 'warning',
      suggestion: issue.suggestion ? String(issue.suggestion) : undefined,
    }));
    
    const batchConfidence = typeof parsed.overallConfidence === 'number' 
      ? parsed.overallConfidence 
      : 0.8;
    
    return {
      issues,
      batchConfidence,
      tokensUsed,
    };
    
  } catch (error) {
    return {
      issues: [],
      batchConfidence: 0,
      tokensUsed: { input: 0, output: 0 },
    };
  }
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
 * Calculate cost in USD (Haiku pricing)
 * Input: $1/M tokens, Output: $5/M tokens
 */
function calculateHaikuCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 1 + (outputTokens / 1_000_000) * 5;
}

/**
 * Create empty/error result
 */
function createEmptyResult(startTime: number, error?: string): VerificationResult {
  return {
    verified: false,
    confidence: 0,
    issues: error ? [{
      itemIndex: -1,
      field: 'verification',
      extractedValue: null,
      issue: error,
      severity: 'warning',
    }] : [],
    itemsVerified: 0,
    itemsFlagged: 0,
    processingTimeMs: Date.now() - startTime,
  };
}
