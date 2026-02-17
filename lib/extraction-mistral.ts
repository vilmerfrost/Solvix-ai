/**
 * Mistral OCR PDF Extraction
 * 
 * Uses Mistral's native OCR API for PDF text extraction,
 * then Mistral Large for structuring the extracted text.
 */

import { getMistralClientForUser, MODELS, trackUsage } from "@/lib/ai-clients";
import { isLikelyInvoice } from "@/lib/extraction/invoice-prompt";
import { safeStr } from "@/lib/safe-str";
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
      // Pass through document type and invoice metadata
      documentType: structuredResult.documentType,
      invoiceData: structuredResult.invoiceData,
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
 * Detects document type (invoice vs waste report) and adapts prompt
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
  documentType?: string;
  invoiceData?: Record<string, unknown>;
}> {
  // Detect document type from filename + OCR text
  const fnLower = filename.toLowerCase();
  const isInvoice = fnLower.includes('faktura') || fnLower.includes('invoice') || isLikelyInvoice(ocrText);
  
  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const filenameDate = dateMatch ? dateMatch[0].replace(/[-_]/g, '-') : null;
  const today = new Date().toISOString().split('T')[0];
  
  if (isInvoice) {
    log.push(`📄 Detected INVOICE document — using invoice extraction prompt`);
    return structureInvoice(client, ocrText, filename, filenameDate || today, settings, log);
  }
  
  log.push(`📄 Detected WASTE REPORT document — using waste extraction prompt`);
  return structureWasteReport(client, ocrText, filename, filenameDate || today, settings, log);
}

/**
 * Structure invoice OCR text into items
 */
async function structureInvoice(
  client: InstanceType<typeof import("@mistralai/mistralai").Mistral>,
  ocrText: string,
  filename: string,
  fallbackDate: string,
  settings: UserSettings,
  log: string[]
): Promise<{
  items: LineItem[];
  confidence: number;
  tokensUsed: { input: number; output: number };
  documentType: string;
  invoiceData?: Record<string, unknown>;
}> {
  const prompt = `Extract ALL data from this Swedish invoice/faktura into JSON.

DOCUMENT: ${filename}

EXTRACT:
1. Header: invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate, supplier, buyerName
2. Payment: bankgiro, plusgiro, ocrReference
3. Amounts: subtotal, vatAmount, totalAmount, currency (default SEK), vatRate
4. ALL line items from the invoice table

SWEDISH NUMBER FORMAT: "1 234,50" → 1234.50 (space=thousands, comma=decimal)
DATE FORMAT: Output as YYYY-MM-DD. Fallback: ${fallbackDate}

OCR TEXT:
${ocrText}

${settings.custom_instructions ? `CUSTOM INSTRUCTIONS (HIGHEST PRIORITY):\n${settings.custom_instructions}\n` : ''}
JSON OUTPUT (no markdown, no backticks):
{
  "documentType": "invoice",
  "invoiceNumber": "12345",
  "invoiceDate": "2025-01-15",
  "dueDate": "2025-02-14",
  "supplier": "Företag AB",
  "buyerName": "Köpare AB",
  "bankgiro": "1234-5678",
  "ocrReference": "7234567890123",
  "subtotal": 10000,
  "vatAmount": 2500,
  "totalAmount": 12500,
  "currency": "SEK",
  "vatRate": 25,
  "items": [
    {"description": "Konsulttjänster", "quantity": 40, "unitPrice": 250, "amount": 10000, "date": "2025-01-15"}
  ],
  "confidence": 0.95
}

Extract ALL line items. Output ONLY valid JSON.`;

  try {
    const response = await client.chat.complete({
      model: MODELS.PDF_STRUCTURING,
      messages: [
        { role: "system", content: "You are a Swedish invoice extraction expert. Extract ALL data into structured JSON. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      maxTokens: 16384,
      temperature: 0,
    });
    
    const text = response.choices?.[0]?.message?.content || "";
    const textContent = typeof text === 'string' ? text : '';
    const tokensUsed = { input: response.usage?.promptTokens || 0, output: response.usage?.completionTokens || 0 };
    
    // Parse the response — invoice JSON may not have "items" at top level
    const parsed = parseGeneralJsonResponse(textContent);
    if (!parsed) {
      log.push(`⚠️ Failed to parse invoice JSON`);
      return { items: [], confidence: 0, tokensUsed, documentType: 'invoice' };
    }
    
    // Map invoice line items → LineItem format so the rest of the pipeline works
    const rawItems = (parsed.items || parsed.invoiceLineItems || []) as Record<string, unknown>[];
    const invoiceDate = safeStr(parsed.invoiceDate, fallbackDate);
    const supplier = safeStr(parsed.supplier);
    const buyer = safeStr(parsed.buyerName);
    
    const items: LineItem[] = rawItems.map((item: Record<string, unknown>) => ({
      date: safeStr(item.date, invoiceDate),
      location: buyer,
      material: safeStr(item.description || item.text),
      weightKg: typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)) || 0,
      unit: "SEK",
      receiver: supplier,
      isHazardous: false,
    }));
    
    // If no line items but we have totals, create a summary item
    if (items.length === 0 && parsed.totalAmount) {
      items.push({
        date: invoiceDate,
        location: buyer,
        material: `Faktura ${parsed.invoiceNumber || filename}`,
        weightKg: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : parseFloat(String(parsed.totalAmount)) || 0,
        unit: "SEK",
        receiver: supplier,
        isHazardous: false,
      });
    }
    
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;
    log.push(`✓ Extracted invoice: ${items.length} line items, supplier=${supplier}`);
    
    // Store full invoice data for the review page
    // Keep invoiceLineItems so the review page can render the invoice table
    const invoiceData: Record<string, unknown> = {};
    const skipKeys = new Set(['items', 'confidence']);
    for (const [key, val] of Object.entries(parsed)) {
      if (!skipKeys.has(key)) invoiceData[key] = val;
    }
    // Ensure invoiceLineItems exists (map from items if not present)
    if (!invoiceData.invoiceLineItems && rawItems.length > 0) {
      invoiceData.invoiceLineItems = rawItems;
    }
    
    return { items, confidence, tokensUsed, documentType: 'invoice', invoiceData };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`⚠️ Invoice structuring failed: ${errorMsg}`);
    return { items: [], confidence: 0, tokensUsed: { input: 0, output: 0 }, documentType: 'invoice' };
  }
}

/**
 * Structure waste report OCR text into items (original logic)
 */
async function structureWasteReport(
  client: InstanceType<typeof import("@mistralai/mistralai").Mistral>,
  ocrText: string,
  filename: string,
  fallbackDate: string,
  settings: UserSettings,
  log: string[]
): Promise<{
  items: LineItem[];
  confidence: number;
  tokensUsed: { input: number; output: number };
}> {
  const receiver = inferReceiver(filename);
  const materialSynonyms = settings.material_synonyms
    ? Object.entries(settings.material_synonyms)
        .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
        .join("\n")
    : "";
  
  const prompt = `Extract ALL waste management data from this OCR text into structured JSON.

MULTI-LANGUAGE: Swedish, Norwegian, Danish, Finnish, or English.

DATE: Period ranges → use END DATE. Output YYYY-MM-DD. Fallback: ${fallbackDate}

MATERIAL SYNONYMS:
${materialSynonyms || 'Use material names as found in document.'}

WEIGHT CONVERSION (always output in kg):
ton/t → ×1000, g/gram → ÷1000, kg → as-is

OCR TEXT:
${ocrText}

${settings.custom_instructions ? `CUSTOM INSTRUCTIONS (HIGHEST PRIORITY):\n${settings.custom_instructions}\n` : ''}
JSON OUTPUT (no markdown, no backticks):
{"items":[{"date":"2024-01-16","location":"Address","material":"Material","weightKg":185,"unit":"Kg","receiver":"${receiver}","isHazardous":false}],"confidence":0.95}

Extract ALL rows. Output ONLY valid JSON.`;

  try {
    const response = await client.chat.complete({
      model: MODELS.PDF_STRUCTURING,
      messages: [
        { role: "system", content: "You are a document extraction expert. Extract ALL data into structured JSON. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      maxTokens: 16384,
      temperature: 0,
    });
    
    const text = response.choices?.[0]?.message?.content || "";
    const textContent = typeof text === 'string' ? text : '';
    const tokensUsed = { input: response.usage?.promptTokens || 0, output: response.usage?.completionTokens || 0 };
    
    const parsed = parseJsonResponse(textContent);
    if (!parsed || !parsed.items || parsed.items.length === 0) {
      log.push(`⚠️ No items parsed from Mistral Large response`);
      return { items: [], confidence: 0, tokensUsed };
    }
    
    const items: LineItem[] = parsed.items.map((item: Record<string, unknown>) => ({
      date: safeStr(item.date, fallbackDate),
      location: safeStr(item.location || item.address),
      material: safeStr(item.material),
      weightKg: typeof item.weightKg === 'number' ? item.weightKg : parseFloat(String(item.weightKg)) || 0,
      unit: safeStr(item.unit, "Kg"),
      receiver: safeStr(item.receiver, receiver),
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
 * Parse any JSON response (for invoices and other non-standard formats)
 */
function parseGeneralJsonResponse(text: string): Record<string, unknown> | null {
  let cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  
  try { return JSON.parse(cleaned); } catch {}
  try {
    const fb = cleaned.indexOf('{'), lb = cleaned.lastIndexOf('}');
    if (fb !== -1 && lb > fb) return JSON.parse(cleaned.substring(fb, lb + 1));
  } catch {}
  return null;
}

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
