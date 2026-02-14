/**
 * Gemini Flash Excel Extraction
 * 
 * Parses Excel files using xlsx library, converts to TSV,
 * chunks in 25-row batches, and extracts via Gemini 3 Flash.
 */

import * as XLSX from "xlsx";
import { getGeminiClientForUser, MODELS, THRESHOLDS, trackUsage } from "@/lib/ai-clients";
import { safeStr } from "@/lib/safe-str";
import type { LineItem, UserSettings, MultiModelExtractionResult, AIProvider } from "@/lib/types";
import { buildExtractionPrompt, parseExtractionResponse } from "@/lib/extraction/types";

// =============================================================================
// TYPES
// =============================================================================

interface ExtractionChunkResult {
  items: LineItem[];
  success: boolean;
  error?: string;
  tokensUsed: { input: number; output: number };
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract data from Excel buffer using Gemini Flash
 */
export async function extractWithGemini(
  buffer: Buffer,
  filename: string,
  userId: string,
  settings: UserSettings,
  log: string[],
  extractionRunId?: string
): Promise<MultiModelExtractionResult> {
  const startTime = Date.now();
  log.push(`📊 Starting Gemini Excel extraction: ${filename}`);
  
  try {
    // Parse Excel to TSV
    const { tsv, header, dataRows, totalRows } = parseExcelToTSV(buffer);
    log.push(`✓ Parsed Excel: ${totalRows} rows`);
    
    if (totalRows === 0) {
      return createErrorResult("No data rows found in Excel file", startTime);
    }
    
    // Get Gemini client (BYOK or system)
    const { client, isUserKey, provider } = await getGeminiClientForUser(userId);
    log.push(`✓ Using ${isUserKey ? "user's" : "system"} ${provider} API key`);
    
    // Infer receiver from filename
    const receiver = inferReceiver(filename);
    
    // Chunk and extract
    const chunkSize = THRESHOLDS.EXTRACTION_BATCH_SIZE;
    const totalChunks = Math.ceil(dataRows.length / chunkSize);
    const allItems: LineItem[] = [];
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    
    log.push(`📦 Extracting in ${totalChunks} chunks of ${chunkSize} rows`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, dataRows.length);
      const chunkRows = dataRows.slice(start, end);
      
      log.push(`  Chunk ${i + 1}/${totalChunks}: rows ${start + 1}-${end}`);
      
      const chunkTsv = [header, ...chunkRows]
        .map(row => row.join('\t'))
        .join('\n');
      
      const result = await extractChunk(
        client,
        chunkTsv,
        filename,
        receiver,
        settings,
        i + 1,
        totalChunks
      );
      
      if (result.success) {
        allItems.push(...result.items);
        totalTokensInput += result.tokensUsed.input;
        totalTokensOutput += result.tokensUsed.output;
        log.push(`    ✓ Extracted ${result.items.length} items`);
      } else {
        log.push(`    ⚠️ Chunk failed: ${result.error}`);
      }
    }
    
    // Calculate confidence based on extraction rate
    const extractionRate = allItems.length / totalRows;
    const confidence = Math.min(extractionRate, 0.95);
    
    // Track usage
    const estimatedCost = calculateCost(totalTokensInput, totalTokensOutput);
    await trackUsage(
      userId,
      extractionRunId || null,
      provider,
      MODELS.EXCEL_EXTRACTION,
      totalTokensInput,
      totalTokensOutput,
      estimatedCost
    );
    
    const processingTime = Date.now() - startTime;
    log.push(`✅ Gemini extraction complete: ${allItems.length} items (${(confidence * 100).toFixed(0)}% confidence)`);
    
    return {
      success: true,
      items: allItems,
      confidence,
      sourceText: tsv,
      model: MODELS.EXCEL_EXTRACTION,
      provider,
      tokensUsed: { input: totalTokensInput, output: totalTokensOutput },
      cost: estimatedCost,
      processingTimeMs: processingTime,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`❌ Gemini extraction failed: ${errorMsg}`);
    return createErrorResult(errorMsg, startTime);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse Excel buffer to TSV format
 */
function parseExcelToTSV(buffer: Buffer): {
  tsv: string;
  header: string[];
  dataRows: string[][];
  totalRows: number;
} {
  const workbook = XLSX.read(buffer);
  const allRows: string[][] = [];
  
  // Combine all sheets
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { 
      header: 1, 
      defval: "",
      raw: false // Get formatted strings
    }) as string[][];
    
    if (sheetData.length === 0) continue;
    
    if (allRows.length === 0) {
      allRows.push(...sheetData);
    } else {
      // Check if first row is header (skip if so)
      const firstRow = sheetData[0];
      const looksLikeHeader = firstRow?.some(cell => 
        String(cell).toLowerCase().match(/datum|material|vikt|kvantitet|adress/)
      );
      
      if (looksLikeHeader && sheetData.length > 1) {
        allRows.push(...sheetData.slice(1));
      } else {
        allRows.push(...sheetData);
      }
    }
  }
  
  // Find header row
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i];
    if (row?.some(cell => 
      String(cell).toLowerCase().match(/datum|material|vikt|kvantitet|adress|date|weight/)
    )) {
      headerIndex = i;
      break;
    }
  }
  
  const header = allRows[headerIndex]?.map(c => String(c)) || [];
  const dataRows = allRows.slice(headerIndex + 1)
    .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""))
    .map(row => row.map(c => String(c)));
  
  const tsv = [header, ...dataRows]
    .map(row => row.join('\t'))
    .join('\n');
  
  return { tsv, header, dataRows, totalRows: dataRows.length };
}

/**
 * Extract a single chunk using Gemini
 */
async function extractChunk(
  client: InstanceType<typeof import("openai").default>,
  tsvChunk: string,
  filename: string,
  receiver: string,
  settings: UserSettings,
  chunkNum: number,
  totalChunks: number
): Promise<ExtractionChunkResult> {
  const prompt = buildExtractionPrompt(
    tsvChunk,
    filename,
    receiver,
    {
      material_synonyms: settings.material_synonyms,
      known_receivers: settings.known_receivers,
    },
    settings.custom_instructions
  );
  
  const systemPrompt = `You are a document extraction expert. Extract ALL rows from the waste document table.
Output ONLY valid JSON with no markdown. Format: {"items":[...]}
Chunk ${chunkNum}/${totalChunks}.`;

  try {
    const response = await client.chat.completions.create({
      model: MODELS.EXCEL_EXTRACTION,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0,
      max_tokens: 16384,
    });
    
    const text = response.choices[0]?.message?.content || "";
    const tokensUsed = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0,
    };
    
    const parsed = parseExtractionResponse(text);
    
    if (!parsed || !parsed.items || parsed.items.length === 0) {
      return { 
        items: [], 
        success: false, 
        error: "No items parsed from response",
        tokensUsed 
      };
    }
    
    // Normalize items to LineItem format
    const items: LineItem[] = parsed.items.map(item => ({
      date: safeStr(item.date),
      location: safeStr(item.location || item.address),
      material: safeStr(item.material),
      weightKg: typeof item.weightKg === 'number' ? item.weightKg : parseFloat(String(item.weightKg)) || 0,
      unit: safeStr(item.unit, "Kg"),
      receiver: safeStr(item.receiver, receiver),
      isHazardous: Boolean(item.isHazardous),
    }));
    
    return { items, success: true, tokensUsed };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { 
      items: [], 
      success: false, 
      error: errorMsg,
      tokensUsed: { input: 0, output: 0 }
    };
  }
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
 * Calculate cost in USD (Gemini Flash pricing)
 * Input: $0.50/M tokens, Output: $3/M tokens
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 0.50 + (outputTokens / 1_000_000) * 3;
}

/**
 * Create error result
 */
function createErrorResult(error: string, startTime: number): MultiModelExtractionResult {
  return {
    success: false,
    items: [],
    confidence: 0,
    model: MODELS.EXCEL_EXTRACTION,
    provider: "google" as AIProvider,
    tokensUsed: { input: 0, output: 0 },
    cost: 0,
    processingTimeMs: Date.now() - startTime,
    error,
  };
}
