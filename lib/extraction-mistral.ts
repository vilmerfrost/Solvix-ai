/**
 * Mistral OCR PDF Extraction
 * 
 * Uses Mistral's native OCR API for PDF text extraction,
 * then Mistral Large for structuring the extracted text.
 */

import { getMistralClientForUser, MODELS, trackUsage } from "@/lib/ai-clients";
import type { LineItem, UserSettings, MultiModelExtractionResult, AIProvider } from "@/lib/types";

// =============================================================================
// TYPES
// =============================================================================

interface OCRResult {
  text: string;
  pages: number;
  tokensUsed: { input: number; output: number };
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract data from PDF buffer using Mistral OCR + Mistral Large
 */
export async function extractWithMistral(
  buffer: Buffer,
  filename: string,
  userId: string,
  settings: UserSettings,
  log: string[],
  extractionRunId?: string
): Promise<MultiModelExtractionResult> {
  const startTime = Date.now();
  log.push(`📄 Starting Mistral PDF extraction: ${filename}`);
  
  try {
    // Get Mistral client (BYOK or system)
    const { client, isUserKey, provider } = await getMistralClientForUser(userId);
    log.push(`✓ Using ${isUserKey ? "user's" : "system"} Mistral API key`);
    
    // Step 1: OCR the PDF
    log.push(`🔍 Running Mistral OCR...`);
    const ocrResult = await runMistralOCR(client, buffer, filename);
    log.push(`✓ OCR complete: ${ocrResult.pages} pages, ${ocrResult.text.length} characters`);
    
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return createErrorResult("OCR returned no text from PDF", startTime);
    }
    
    // Step 2: Structure the extracted text
    log.push(`📊 Structuring extracted text with Mistral Large...`);
    const structuredResult = await structureWithMistralLarge(
      client,
      ocrResult.text,
      filename,
      settings,
      log
    );
    
    // Calculate totals
    const totalTokensInput = ocrResult.tokensUsed.input + structuredResult.tokensUsed.input;
    const totalTokensOutput = ocrResult.tokensUsed.output + structuredResult.tokensUsed.output;
    const estimatedCost = calculateMistralCost(totalTokensInput, totalTokensOutput);
    
    // Track usage
    await trackUsage(
      userId,
      extractionRunId || null,
      provider,
      `${MODELS.PDF_OCR} + ${MODELS.PDF_STRUCTURING}`,
      totalTokensInput,
      totalTokensOutput,
      estimatedCost
    );
    
    const processingTime = Date.now() - startTime;
    log.push(`✅ Mistral extraction complete: ${structuredResult.items.length} items`);
    
    return {
      success: true,
      items: structuredResult.items,
      confidence: structuredResult.confidence,
      sourceText: ocrResult.text,
      model: `${MODELS.PDF_OCR} → ${MODELS.PDF_STRUCTURING}`,
      provider,
      tokensUsed: { input: totalTokensInput, output: totalTokensOutput },
      cost: estimatedCost,
      processingTimeMs: processingTime,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`❌ Mistral extraction failed: ${errorMsg}`);
    return createErrorResult(errorMsg, startTime);
  }
}

// =============================================================================
// OCR FUNCTION
// =============================================================================

/**
 * Run Mistral OCR on PDF buffer using dedicated OCR endpoint
 * Requires: 1) Upload file, 2) OCR by file ID
 */
async function runMistralOCR(
  client: InstanceType<typeof import("@mistralai/mistralai").Mistral>,
  buffer: Buffer,
  filename: string
): Promise<OCRResult> {
  // Step 1: Upload the PDF buffer to Mistral
  // The SDK requires the file to be uploaded before OCR processing
  const uploaded = await client.files.upload({
    file: {
      fileName: filename,
      content: buffer,
    },
    purpose: "ocr",
  });
  
  // Step 2: Run OCR on the uploaded file
  // Use the dedicated OCR endpoint with file ID reference
  const ocrResult = await client.ocr.process({
    model: MODELS.PDF_OCR,
    document: {
      type: "file",
      fileId: uploaded.id,
    },
    // TypeScript SDK uses camelCase (NOT snake_case)
    tableFormat: "html",
  });
  
  // Step 3: Extract text from OCR response
  // Combine all pages into a single text string
  const textParts: string[] = [];
  
  if (ocrResult.pages && Array.isArray(ocrResult.pages)) {
    for (const page of ocrResult.pages) {
      // Use markdown format which includes tables
      if (page.markdown) {
        textParts.push(page.markdown);
      } else if (page.text) {
        textParts.push(page.text);
      }
    }
  }
  
  const text = textParts.join('\n\n');
  const pages = ocrResult.pages?.length || 1;
  
  return {
    text,
    pages,
    tokensUsed: {
      input: ocrResult.usage?.promptTokens || 0,
      output: ocrResult.usage?.completionTokens || 0,
    }
  };
}

// =============================================================================
// STRUCTURING FUNCTION
// =============================================================================

/**
 * Structure OCR text into line items using Mistral Large
 */
async function structureWithMistralLarge(
  client: InstanceType<typeof import("@mistralai/mistralai").Mistral>,
  ocrText: string,
  filename: string,
  settings: UserSettings,
  log: string[]
): Promise<{
  items: LineItem[];
  confidence: number;
  tokensUsed: { input: number; output: number };
}> {
  // Infer receiver from filename
  const receiver = inferReceiver(filename);
  
  // Build material synonyms section
  const materialSynonyms = settings.material_synonyms
    ? Object.entries(settings.material_synonyms)
        .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
        .join("\n")
    : "";
  
  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const filenameDate = dateMatch ? dateMatch[0].replace(/[-_]/g, '-') : null;
  
  const prompt = `Extract ALL waste management data from this OCR text into structured JSON.

═══════════════════════════════════════════════════════════════════════════════
MULTI-LANGUAGE SUPPORT
═══════════════════════════════════════════════════════════════════════════════
Document may be in: Swedish, Norwegian, Danish, Finnish, or English.
Recognize terms in any of these languages.

═══════════════════════════════════════════════════════════════════════════════
DATE HANDLING
═══════════════════════════════════════════════════════════════════════════════
- If date is a period range, extract the END DATE
- Output dates as YYYY-MM-DD
- Fallback date: ${filenameDate || 'today'}

═══════════════════════════════════════════════════════════════════════════════
MATERIAL STANDARDIZATION
═══════════════════════════════════════════════════════════════════════════════
${materialSynonyms || 'Use material names as found in document.'}

═══════════════════════════════════════════════════════════════════════════════
WEIGHT CONVERSION (always output in kg)
═══════════════════════════════════════════════════════════════════════════════
- ton/t/tonn/tonnes → ×1000
- g/gram → ÷1000
- kg/kilogram → as-is

═══════════════════════════════════════════════════════════════════════════════
OCR TEXT
═══════════════════════════════════════════════════════════════════════════════
${ocrText}

${settings.custom_instructions ? `═══════════════════════════════════════════════════════════════════════════════
CUSTOM INSTRUCTIONS (HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════════════════
${settings.custom_instructions}
` : ''}
═══════════════════════════════════════════════════════════════════════════════
JSON OUTPUT FORMAT (no markdown, no backticks)
═══════════════════════════════════════════════════════════════════════════════
{"items":[{"date":"2024-01-16","location":"Address","material":"Material","weightKg":185,"unit":"Kg","receiver":"${receiver}","isHazardous":false}],"confidence":0.95}

Extract ALL rows. Output ONLY valid JSON.`;

  try {
    const response = await client.chat.complete({
      model: MODELS.PDF_STRUCTURING,
      messages: [
        {
          role: "system",
          content: "You are a document extraction expert. Extract ALL data from the OCR text into structured JSON. Output ONLY valid JSON with no markdown."
        },
        { role: "user", content: prompt }
      ],
      maxTokens: 16384,
      temperature: 0,
    });
    
    const text = response.choices?.[0]?.message?.content || "";
    const textContent = typeof text === 'string' ? text : '';
    
    const tokensUsed = {
      input: response.usage?.promptTokens || 0,
      output: response.usage?.completionTokens || 0,
    };
    
    // Parse JSON response
    const parsed = parseJsonResponse(textContent);
    
    if (!parsed || !parsed.items || parsed.items.length === 0) {
      log.push(`⚠️ No items parsed from Mistral Large response`);
      return { items: [], confidence: 0, tokensUsed };
    }
    
    // Normalize items to LineItem format
    const items: LineItem[] = parsed.items.map((item: Record<string, unknown>) => ({
      date: String(item.date || filenameDate || ""),
      location: String(item.location || item.address || ""),
      material: String(item.material || ""),
      weightKg: typeof item.weightKg === 'number' ? item.weightKg : parseFloat(String(item.weightKg)) || 0,
      unit: String(item.unit || "Kg"),
      receiver: String(item.receiver || receiver),
      isHazardous: Boolean(item.isHazardous),
    }));
    
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;
    
    log.push(`✓ Structured ${items.length} items (${(confidence * 100).toFixed(0)}% confidence)`);
    
    return { items, confidence, tokensUsed };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`⚠️ Structuring failed: ${errorMsg}`);
    return { items: [], confidence: 0, tokensUsed: { input: 0, output: 0 } };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse JSON response with multiple fallback strategies
 */
function parseJsonResponse(text: string): { items: Record<string, unknown>[]; confidence?: number } | null {
  // Clean the response
  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/^[^{[]+/, '')
    .replace(/[^}\]]+$/, '')
    .trim();
  
  // Strategy 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Strategy 2: Find first { and last }
    try {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
    } catch {
      // Strategy 3: Look for items array
      try {
        const itemsMatch = cleaned.match(/"items"\s*:\s*\[([\s\S]*?)\]/);
        if (itemsMatch) {
          return JSON.parse(`{"items":[${itemsMatch[1]}]}`);
        }
      } catch {
        // All strategies failed
      }
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
 * Calculate cost in USD (Mistral pricing)
 * OCR: ~$0.10/M input, $0.30/M output
 * Large: ~$2/M input, $6/M output
 * Using averaged cost
 */
function calculateMistralCost(inputTokens: number, outputTokens: number): number {
  // Approximate weighted average
  return (inputTokens / 1_000_000) * 1.0 + (outputTokens / 1_000_000) * 3.0;
}

/**
 * Create error result
 */
function createErrorResult(error: string, startTime: number): MultiModelExtractionResult {
  return {
    success: false,
    items: [],
    confidence: 0,
    model: MODELS.PDF_OCR,
    provider: "mistral" as AIProvider,
    tokensUsed: { input: 0, output: 0 },
    cost: 0,
    processingTimeMs: Date.now() - startTime,
    error,
  };
}
