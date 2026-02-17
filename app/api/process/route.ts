import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import { extractAdaptive } from "@/lib/adaptive-extraction";
import { MODELS } from "@/lib/ai-clients";
import { processOfficeDocument } from "@/lib/office/orchestrator";
import { processDocument as processDocumentDirect } from "@/lib/process-document";
import { getApiUser } from "@/lib/api-auth";

// ============================================================================
// DATE EXTRACTION HELPERS
// ============================================================================

/**
 * Extract date from filename (YYYY-MM-DD format)
 * Handles duplicate filenames like "file (1).xlsx" by cleaning them first
 */
function extractDateFromFilename(filename: string): string | null {
  // Remove (1), (2), etc. before extracting to handle duplicate filenames
  const cleanFilename = filename.replace(/\s*\(\d+\)/g, '');
  
  // Try multiple patterns
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,           // 2025-10-13
    /(\d{4}_\d{2}_\d{2})/,           // 2025_10_13
    /(\d{4}\.\d{2}\.\d{2})/,         // 2025.10.13
    /(\d{8})/,                        // 20251013
  ];
  
  for (const pattern of patterns) {
    const match = cleanFilename.match(pattern);
    if (match) {
      let dateStr = match[1];
      // Convert YYYYMMDD to YYYY-MM-DD
      if (dateStr.length === 8 && !dateStr.includes('-')) {
        dateStr = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
      }
      // Normalize separators
      dateStr = dateStr.replace(/[_.]/g, '-');
      
      // Validate date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
    }
  }
  
  return null;
}

/**
 * Parse Excel date (handles serial dates and various formats)
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null;
  
  // If it's already a valid date string (YYYY-MM-DD)
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return value;
    }
  }
  
  // If it's an Excel serial date (number)
  if (typeof value === 'number' && value > 1 && value < 1000000) {
    // Excel epoch starts Jan 1, 1900
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try parsing as date string
  if (typeof value === 'string') {
    // Try various formats
    const formats = [
      /(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD
      /(\d{2}\/\d{2}\/\d{4})/,         // DD/MM/YYYY
      /(\d{4}\/\d{2}\/\d{2})/,         // YYYY/MM/DD
      /(\d{2}\.\d{2}\.\d{4})/,         // DD.MM.YYYY
    ];
    
    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        let dateStr = match[1];
        // Convert DD/MM/YYYY to YYYY-MM-DD
        if (dateStr.includes('/') && dateStr.split('/')[0].length === 2) {
          const parts = dateStr.split('/');
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        // Convert DD.MM.YYYY to YYYY-MM-DD
        if (dateStr.includes('.') && dateStr.split('.')[0].length === 2) {
          const parts = dateStr.split('.');
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try direct Date parsing
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Validate and fix date - use filename date if extracted date seems wrong
 */
function validateAndFixDate(extractedDate: string | null, filenameDate: string | null, filename: string): string {
  const today = new Date().toISOString().split('T')[0];
  
  // If no extracted date, use filename date or today
  if (!extractedDate) {
    return filenameDate || today;
  }
  
  // Parse extracted date
  const extracted = parseExcelDate(extractedDate);
  if (!extracted) {
    return filenameDate || today;
  }
  
  // If filename has a date, compare
  if (filenameDate) {
    const extractedDateObj = new Date(extracted);
    const filenameDateObj = new Date(filenameDate);
    const todayObj = new Date(today);
    
    // If extracted date is more than 2 years old or in the future, use filename date
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    if (extractedDateObj < twoYearsAgo || extractedDateObj > todayObj) {
      console.log(`⚠️  Extracted date ${extracted} seems wrong, using filename date ${filenameDate}`);
      return filenameDate;
    }
    
    // If dates are very different (>30 days), prefer filename date
    const diffDays = Math.abs((extractedDateObj.getTime() - filenameDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      console.log(`⚠️  Extracted date ${extracted} differs from filename date ${filenameDate} by ${diffDays} days, using filename date`);
      return filenameDate;
    }
  }
  
  return extracted;
}

// Dynamic Anthropic client - created per-request with user's API key
// Falls back to env variable if no user key is configured
let defaultAnthropicKey = process.env.ANTHROPIC_API_KEY;

async function getAnthropicClient(userId?: string): Promise<Anthropic> {
  // Try to get user's API key first
  if (userId) {
    const supabase = createServiceRoleClient();
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, is_valid")
      .eq("user_id", userId)
      .eq("provider", "anthropic")
      .single();
    
    if (keyData?.encrypted_key && keyData.is_valid) {
      try {
        // Decrypt the key
        const { decryptAPIKey } = await import("@/lib/encryption");
        const decryptedKey = decryptAPIKey(keyData.encrypted_key);
        if (decryptedKey) {
          return new Anthropic({ apiKey: decryptedKey });
        }
      } catch (e) {
        console.warn("Failed to decrypt user API key, falling back to env");
      }
    }
  }
  
  // Fallback to environment variable
  if (!defaultAnthropicKey) {
    throw new Error("No Anthropic API key configured. Please add your API key in Settings → API Keys.");
  }
  
  return new Anthropic({ apiKey: defaultAnthropicKey });
}

// Legacy global client for backward compatibility (will be removed)
const anthropic = defaultAnthropicKey 
  ? new Anthropic({ apiKey: defaultAnthropicKey })
  : null;

// ============================================================================
// SETTINGS
// ============================================================================
async function getSettings(userId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  return data || {
    auto_approve_threshold: 80,
    material_synonyms: {
      "Trä": ["Brädor", "Virke", "Lastpall", "Spont"],
      "Metall": ["Järn", "Stål", "Aluminium"],
      "Gips": ["Gipsplattor", "Gipsskivor"],
      "Betong": ["Cement", "Ballast"]
    }
  };
}

// ============================================================================
// OLD CHUNKED EXTRACTION - REMOVED (replaced by adaptive extraction)
// ============================================================================
// This function is no longer used - all Excel files now use extractAdaptive()
// Keeping for reference only - can be deleted
async function _extractAllRows_DEPRECATED(
  excelData: any[][],
  filename: string,
  settings: any
): Promise<any> {
  
  // Find header row
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, excelData.length); i++) {
    const row = excelData[i];
    if (row.some(cell => 
      String(cell).toLowerCase().includes('datum') ||
      String(cell).toLowerCase().includes('material') ||
      String(cell).toLowerCase().includes('kvantitet')
    )) {
      headerIndex = i;
      break;
    }
  }
  
  const header = excelData[headerIndex];
  const dataRows = excelData.slice(headerIndex + 1).filter(row => 
    row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "")
  );
  
  const totalRows = dataRows.length;
  
  if (totalRows === 0) {
    throw new Error("No data rows found!");
  }
  
  // Infer receiver from filename
  let receiver = "Okänd mottagare";
  const fn = filename.toLowerCase();
  if (fn.includes('ragn-sells') || fn.includes('ragnsells')) receiver = "Ragn-Sells";
  else if (fn.includes('renova')) receiver = "Renova";
  else if (fn.includes('nsr')) receiver = "NSR";
  
  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const documentDate = dateMatch ? dateMatch[1] : null;
  
  // Material synonyms
  const synonyms = Object.entries(settings.material_synonyms || {})
    .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
    .join("\n");
  
  // CHUNK SIZE - Use Haiku for cost efficiency
  const CHUNK_SIZE = 150; // Haiku can handle larger chunks
  const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
  
  const allItems: any[] = [];
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalRows);
    const chunkRows = dataRows.slice(start, end);
    
    // Convert to TSV
    const tsv = [header, ...chunkRows]
      .map(row => row.map(cell => String(cell || "")).join('\t'))
      .join('\n');
    
    // EXTRACTION PROMPT
    const prompt = `⚠️ CRITICAL: EXTRACT EVERY SINGLE ROW FROM THIS TABLE!

This is chunk ${chunkIndex + 1} of ${totalChunks}. Total file has ${totalRows} rows.

MATERIAL SYNONYMS:
${synonyms}

MANDATORY FIELDS:
- date: Datum column (YYYY-MM-DD)${documentDate ? ` - If missing, use "${documentDate}" from filename` : ''}
- location: Uppdragsställe column  
- material: Material column (use standard names)
- weightKg: Kvantitet column (convert to kg if needed)
- unit: Always "Kg"
- receiver: Use "${receiver}" for all rows

CRITICAL RULES:
1. EXTRACT EVERY ROW - Do NOT skip any!
2. If Enhet = "ton", multiply Kvantitet by 1000
3. If Enhet = "g", divide Kvantitet by 1000
4. Use ${receiver} as receiver for ALL rows
5. Use "${documentDate || 'today\'s date'}" as date if date column is missing

TABLE DATA:
${tsv}

OUTPUT (JSON only, no markdown, NO {value, confidence} wrappers):
{
  "items": [
    {"date": "${documentDate || "2024-01-16"}", "location": "Artedigränd 10 UMEÅ", "material": "Papper, kontor", "weightKg": 185.00, "unit": "Kg", "receiver": "${receiver}"}
  ]
}

Extract ALL ${chunkRows.length} rows from this chunk!`;

    // Retry logic with Sonnet fallback
    let processedItems: any[] = [];
    let chunkSuccess = false;
    let lastError: any = null;
    
    // Try with Haiku first (cheaper)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = attempt === 0 
          ? MODELS.VERIFICATION  // Try Haiku first
          : MODELS.RECONCILIATION;  // Fallback to Sonnet
        
        console.log(`   🔄 Attempt ${attempt + 1}/2: Using ${model === MODELS.VERIFICATION ? "Haiku" : "Sonnet"}`);
        
        const response = await anthropic.messages.create({
          model: model as any,
          max_tokens: attempt === 0 ? 8192 : 16384, // More tokens for Sonnet
          messages: [{ role: "user", content: prompt }]
        });
        
        const text = response.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => (b as any).text)
          .join('');
        
        // Better JSON extraction - try multiple strategies
        let parsed: any = null;
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Strategy 1: Direct parse
        try {
          parsed = JSON.parse(cleaned);
        } catch (e1: any) {
          // Strategy 2: Find first { and last }
          try {
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } else {
              throw new Error("No JSON found");
            }
          } catch (e2: any) {
            // Strategy 3: Try to fix common issues
            try {
              // Remove trailing commas before closing braces/brackets
              cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
              // Fix unclosed strings (add quote at end if missing)
              const openQuotes = (cleaned.match(/"/g) || []).length;
              if (openQuotes % 2 !== 0) {
                cleaned = cleaned.trim() + '"';
              }
              parsed = JSON.parse(cleaned);
            } catch (e3: any) {
              throw new Error(`JSON parse failed after 3 strategies: ${e1?.message || 'Unknown error'}`);
            }
          }
        }
        
        const items = parsed?.items || [];
        
        // Ensure all items have date and receiver
        processedItems = items.map((item: any) => ({
          ...item,
          date: item.date || documentDate || new Date().toISOString().split('T')[0],
          receiver: item.receiver || receiver,
        }));
        
        allItems.push(...processedItems);
        chunkSuccess = true;
        
        break; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        console.error(`   ⚠️ Attempt ${attempt + 1} failed:`, (error instanceof Error ? error.message : String(error)));
        
        // If it's a JSON parse error and we haven't tried Sonnet yet, continue to retry
        if (attempt === 0 && ((error instanceof Error ? error.message : String(error)).includes('JSON') || (error instanceof Error ? error.message : String(error)).includes('parse'))) {
          console.log(`   🔄 Retrying with Sonnet (better JSON handling)...`);
          continue;
        }
        
        // If it's not a JSON error or we've already tried Sonnet, break
        if (attempt === 1 || !(error instanceof Error ? error.message : String(error)).includes('JSON')) {
          break;
        }
      }
    }
    
    if (!chunkSuccess) {
      console.error(`   ❌ Chunk ${chunkIndex + 1} failed after all retries:`, lastError?.message);
      // Don't throw - continue processing other chunks
    }
  }
  
  
  if (allItems.length < totalRows * 0.9) {
    console.warn(`⚠️ WARNING: Only got ${allItems.length}/${totalRows} rows!`);
  }
  
  // Aggregate by primary key
  const grouped = new Map<string, any>();
  
  for (const item of allItems) {
    const key = `${item.date}|${item.location}|${item.material}|${item.receiver}`;
    
    if (grouped.has(key)) {
      // Merge weights
      const existing = grouped.get(key);
      existing.weightKg = (existing.weightKg || 0) + (item.weightKg || 0);
      } else {
      grouped.set(key, { ...item });
    }
  }
  
  const aggregated = Array.from(grouped.values());
  
  console.log(`\n📊 AGGREGATION:`);
  console.log(`   Original: ${allItems.length} rows`);
  console.log(`   Aggregated: ${aggregated.length} rows`);
  console.log(`   Merged: ${allItems.length - aggregated.length} duplicates`);
  
  const totalWeight = aggregated.reduce((sum: number, item: any) => sum + (item.weightKg || 0), 0);
  console.log(`   Total weight: ${totalWeight.toFixed(2)} kg = ${(totalWeight/1000).toFixed(2)} ton`);
  
  const uniqueAddresses = new Set(aggregated.map((item: any) => item.location)).size;
  const uniqueMaterials = new Set(aggregated.map((item: any) => item.material)).size;
  
  console.log(`   Unique addresses: ${uniqueAddresses}`);
  console.log(`   Unique materials: ${uniqueMaterials}`);
  console.log(`${"=".repeat(80)}\n`);
  
  return {
    lineItems: aggregated,
    metadata: {
      totalRows,
      extractedRows: allItems.length,
      aggregatedRows: aggregated.length,
      chunked: true,
      chunks: totalChunks,
      model: "haiku" // Track which model was used
    },
    totalWeightKg: totalWeight,
    totalCostSEK: 0,
    documentType: "waste_report",
    uniqueAddresses,
    uniqueReceivers: 1,
    uniqueMaterials,
    _validation: {
      completeness: (allItems.length / totalRows) * 100,
      confidence: 95,
      issues: allItems.length < totalRows ? [`Missing ${totalRows - allItems.length} rows`] : []
    }
  };
}

// ============================================================================
// PDF EXTRACTION WITH CLAUDE VISION
// ============================================================================

// Helper function to clean PDF extraction results (remove {value, confidence} wrappers)
function cleanPDFExtractionData(items: any[]): any[] {
  return items.map(item => {
    // Handle both wrapped ({value, confidence}) and clean formats
    // Note: location might be "USE_DOCUMENT_ADDRESS" marker - will be replaced later
    const cleanItem: any = {
      date: item.date?.value || item.date || null,
      location: item.location?.value || item.location || item.address?.value || item.address || null, // Keep null, will use document address
      material: item.material?.value || item.material || "Okänt material",
      weightKg: parseFloat(String(item.weightKg?.value || item.weightKg || item.weight?.value || item.weight || 0)),
      unit: item.unit?.value || item.unit || "Kg",
      receiver: item.receiver?.value || item.receiver || "Okänd mottagare",
    };
    
    // Add optional fields if they exist
    if (item.cost?.value !== undefined || item.cost !== undefined) {
      cleanItem.costSEK = parseFloat(String(item.cost?.value || item.cost || 0));
    }
    
    if (item.wasteCode?.value || item.wasteCode) {
      cleanItem.wasteCode = item.wasteCode?.value || item.wasteCode;
    }
    
    if (item.handling?.value || item.handling) {
      cleanItem.handling = item.handling?.value || item.handling;
    }
    
    if (item.isHazardous?.value !== undefined || item.isHazardous !== undefined) {
      cleanItem.isHazardous = item.isHazardous?.value || item.isHazardous;
    }
    
    return cleanItem;
  });
}

async function extractFromPDF(
  pdfBuffer: ArrayBuffer,
  filename: string,
  settings: any,
  userId?: string
): Promise<any> {
  // Get Anthropic client for this user
  const userAnthropicClient = await getAnthropicClient(userId);
  
  // ✅ Processing log for tracking (matches extractAdaptive pattern)
  const processingLog: string[] = [];
  const log = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${message}`;
    processingLog.push(logEntry);
    console.log(message);
  };
  
  log(`${"=".repeat(60)}`, 'info');
  log(`📄 PDF EXTRACTION: ${filename}`, 'info');
  log(`${"=".repeat(60)}`, 'info');
  
  // Convert PDF to base64
  const base64Data = Buffer.from(pdfBuffer).toString("base64");
  log(`✓ PDF converted to base64 (${(pdfBuffer.byteLength / 1024).toFixed(0)} KB)`, 'success');
  
  // Infer receiver from filename
  let receiver = "Okänd mottagare";
  const fn = filename.toLowerCase();
  if (fn.includes('ragn-sells') || fn.includes('ragnsells')) receiver = "Ragn-Sells";
  else if (fn.includes('renova')) receiver = "Renova";
  else if (fn.includes('nsr')) receiver = "NSR";
  log(`✓ Inferred receiver: ${receiver}`, 'info');
  
  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const filenameDate = dateMatch ? dateMatch[1] : null;
  if (filenameDate) {
    log(`✓ Date from filename: ${filenameDate}`, 'info');
  }

  // Detect if this is likely an invoice based on filename
  const filenameLC = (filename || '').toLowerCase();
  const isInvoice = filenameLC.includes('faktura') || filenameLC.includes('invoice');

  if (isInvoice) {
    log('📄 Detected INVOICE document — using invoice extraction prompt', 'info');
    const { buildInvoiceExtractionPrompt } = await import("@/lib/extraction/invoice-prompt");
    const invoicePrompt = buildInvoiceExtractionPrompt('', filename);

    try {
      const invoiceResponse = await userAnthropicClient.messages.create({
        model: MODELS.RECONCILIATION,
        max_tokens: 16384,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } },
            { type: "text", text: invoicePrompt },
          ],
        }],
      });

      const invoiceText = invoiceResponse.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => (b as any).text)
        .join('');

      let cleaned = invoiceText.replace(/```json/g, '').replace(/```/g, '').trim();
      let invoiceParsed: any = null;
      try { invoiceParsed = JSON.parse(cleaned); } catch {
        const fb = cleaned.indexOf('{'), lb = cleaned.lastIndexOf('}');
        if (fb !== -1 && lb > fb) invoiceParsed = JSON.parse(cleaned.substring(fb, lb + 1));
      }

      if (invoiceParsed) {
        invoiceParsed.documentType = 'invoice';
        log(`✓ Invoice extracted: ${invoiceParsed.invoiceNumber?.value || 'unknown'} from ${invoiceParsed.supplier?.value || 'unknown'}`, 'success');

        return {
          ...invoiceParsed,
          lineItems: [],
          metadata: { totalRows: 0, extractedRows: 0, chunked: false, chunks: 1, model: "sonnet-4-5" },
          totalWeightKg: 0,
          totalCostSEK: 0,
          uniqueAddresses: 0,
          uniqueReceivers: 0,
          uniqueMaterials: 0,
          _validation: { completeness: 95, confidence: 90, issues: [] },
          _processingLog: processingLog,
        };
      }
    } catch (invoiceError) {
      log(`⚠️ Invoice extraction failed, falling back to waste extraction: ${invoiceError instanceof Error ? invoiceError.message : String(invoiceError)}`, 'warning');
    }
  }
  
  // Material synonyms
  const synonyms = Object.entries(settings.material_synonyms || {})
    .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
    .join("\n");
  
  // Build extraction prompt - Extract document-level info AND table rows
  const prompt = `Extract ALL waste data AND document metadata from this Swedish PDF.

CRITICAL METADATA TO EXTRACT:
1. DOCUMENT DATE: Look for date in header ("Datum:", "Datum:"), footer, or most common date in table rows
2. PROJECT/ADDRESS: Look for project name, "Projekt:", address at top of document
3. SUPPLIER/SENDER: Look for company name at bottom, footer, sender info, email signature area
4. RECEIVER: Who receives the waste (may be in table or header)

CRITICAL: This PDF has TWO types of information:
1. DOCUMENT-LEVEL info (at top/header/footer): Date, supplier, project name, address
2. TABLE ROWS: Material, weight, receiver, etc.

EXTRACT BOTH!

MATERIAL SYNONYMS:
${synonyms}

OUTPUT FORMAT (JSON, no markdown, NO {value, confidence} wrappers):
{
  "documentInfo": {
    "date": "2025-09-18",                    // From header/footer OR most common date in table
    "projectName": "Östergårds Förskola",
    "projectAddress": "Östergårds Förskola, Malmö",
    "address": "Östergårds Förskola",        // Same as projectAddress
    "supplier": "Stefan Hallberg",           // From footer/bottom/sender
    "receiver": "${receiver}"                 // Use this if not in document
  },
  "items": [
    {
      "date": "2025-09-18",                  // Row date OR document date
      "location": "USE_DOCUMENT_ADDRESS",     // Use if no per-row address
      "material": "Trä",
      "weightKg": 3820,
      "unit": "Kg",
      "receiver": "${receiver}"
    }
  ]
}

RULES:
1. Extract document date from header/footer FIRST (look for "Datum:", date near top/bottom)
2. If no header date, use most common date found in table rows
3. Extract supplier/company name from bottom of document, footer, or sender area
4. Extract document-level address from header/top (look for "Projekt:", "Adress:", etc.)
5. If table has NO address/location column, use "USE_DOCUMENT_ADDRESS" as location marker
6. If table has NO date column, use document date for all rows
7. All weights in kg (convert from ton: × 1000, from g: ÷ 1000)
8. Extract EVERY row from table
9. Use "${receiver}" as receiver if not specified

FALLBACKS (if not found in document):
- Date: Use "${filenameDate || new Date().toISOString().split('T')[0]}"
- Supplier: Use "Okänd leverantör"
- Address: Use "Okänd adress"

WEIGHT CONVERSION:
- If unit is "ton" or "t": multiply by 1000
- If unit is "g": divide by 1000
- If unit is "kg": use as-is

CRITICAL: Output CLEAN JSON (NO {value, confidence} wrappers!)
Return values directly: "material": "Betong" NOT "material": {"value": "Betong"}
Extract ALL material rows from the table. Return JSON only!`;

  try {
    log(`📤 Calling Claude Sonnet for PDF OCR...`, 'info');
    const response = await userAnthropicClient.messages.create({
      model: MODELS.RECONCILIATION, // Use Sonnet for better PDF OCR quality
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => (b as any).text)
      .join('');
    
    log(`✓ Claude response received (${text.length} chars)`, 'success');
    
    // Clean and parse
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Try multiple JSON parsing strategies
    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e1: any) {
      // Strategy 2: Find first { and last }
      try {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        } else {
          throw new Error("No JSON found");
        }
      } catch (e2: any) {
        // Strategy 3: Try to fix common issues
        try {
          cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
          const openQuotes = (cleaned.match(/"/g) || []).length;
          if (openQuotes % 2 !== 0) {
            cleaned = cleaned.trim() + '"';
          }
          parsed = JSON.parse(cleaned);
        } catch (e3: any) {
          log(`❌ JSON parsing failed: ${e1?.message || 'Unknown'}`, 'error');
          throw new Error(`JSON parse failed: ${e1?.message || 'Unknown'}`);
        }
      }
    }
    
    log(`✓ JSON parsed successfully`, 'success');
    
    // Extract document-level info with improved fallbacks
    const documentInfo = parsed.documentInfo || {};
    
    // Date extraction priority: document date → filename → current date
    // Validate extracted date and use filename date if extracted date seems wrong
    const rawDocumentDate = documentInfo.date ? parseExcelDate(documentInfo.date) : null;
    const documentDate = validateAndFixDate(
      rawDocumentDate,
      filenameDate,
      filename
    );
    
    // Address extraction priority: projectAddress → address → projectName → location
    const documentAddress = documentInfo.projectAddress || 
                            documentInfo.address || 
                            documentInfo.projectName || 
                            documentInfo.location ||
                            null;
    
    // Supplier extraction: from footer/bottom of document
    const documentSupplier = documentInfo.supplier || 
                             documentInfo.sender ||
                             "Okänd leverantör";
    
    log(`📋 Document metadata extracted:`, 'info');
    log(`   Date: ${documentDate || 'Not found'}`, 'info');
    log(`   Address: ${documentAddress || 'Not found'}`, 'info');
    log(`   Supplier: ${documentSupplier}`, 'info');
    
    const rawItems = parsed.items || [];
    log(`📦 Found ${rawItems.length} raw items in PDF`, 'info');
    
    // CRITICAL: Clean the data to remove {value, confidence} wrappers
    const cleanedItems = cleanPDFExtractionData(rawItems);
    
    // Ensure all items have date, receiver, and location (use document address if missing)
    const processedItems = cleanedItems.map((item: any) => {
      // Determine location: use document address if row has "USE_DOCUMENT_ADDRESS" marker or missing location
      let location = item.location?.value || item.location;
      
      if (!location || 
          location === "USE_DOCUMENT_ADDRESS" || 
          location === "SAKNAS" || 
          location === "" ||
          String(location).toLowerCase() === "okänd adress") {
        location = documentAddress || "Okänd adress";
      }
      
      // Validate and fix date for each item
      const itemDate = item.date ? parseExcelDate(item.date) : null;
      const finalItemDate = validateAndFixDate(itemDate, filenameDate, filename) || documentDate;
      
      return {
        ...item,
        date: finalItemDate, // Use validated date
        receiver: item.receiver || receiver,
        location: location, // Use document address if row doesn't have one
        weightKg: parseFloat(String(item.weightKg || 0)), // Ensure it's a number
      };
    });
    
    
    // Aggregate by primary key
    const grouped = new Map<string, any>();
    
    for (const item of processedItems) {
      const key = `${item.date}|${item.location}|${item.material}|${item.receiver}`;
      
      // Ensure weightKg is a number
      const weightKg = parseFloat(String(item.weightKg || 0));
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.weightKg = parseFloat(String(existing.weightKg || 0)) + weightKg;
        // Merge optional fields if they exist
        if (item.costSEK && !existing.costSEK) {
          existing.costSEK = parseFloat(String(item.costSEK));
        }
      } else {
        grouped.set(key, { 
          ...item,
          weightKg: weightKg // Ensure it's a number
        });
      }
    }
    
    const aggregated = Array.from(grouped.values());
    const totalWeight = aggregated.reduce((sum: number, item: any) => {
      const weight = parseFloat(String(item.weightKg || 0));
      return sum + weight;
    }, 0);
    
    const uniqueAddresses = new Set(aggregated.map((item: any) => item.location)).size;
    const uniqueMaterials = new Set(aggregated.map((item: any) => item.material)).size;
    
    log(`✅ Aggregation complete: ${processedItems.length} rows → ${aggregated.length} unique combinations`, 'success');
    
    // Calculate total cost if available
    const totalCostSEK = aggregated.reduce((sum: number, item: any) => {
      const cost = parseFloat(String(item.costSEK || 0));
      return sum + cost;
    }, 0);
    
    // Final summary
    log(`${"=".repeat(60)}`, 'info');
    log(`📊 PDF EXTRACTION RESULTS:`, 'info');
    log(`   Extracted: ${processedItems.length} rows`, 'success');
    log(`   Aggregated: ${aggregated.length} unique combinations`, 'info');
    log(`   Total weight: ${(totalWeight/1000).toFixed(2)} ton`, 'info');
    log(`   Unique addresses: ${uniqueAddresses}`, 'info');
    log(`   Unique materials: ${uniqueMaterials}`, 'info');
    log(`${"=".repeat(60)}`, 'info');
    
    return {
      lineItems: aggregated, // Clean data, no wrappers!
      metadata: {
        totalRows: processedItems.length,
        extractedRows: processedItems.length,
        aggregatedRows: aggregated.length,
        chunked: false,
        chunks: 1,
        model: "sonnet-4-5" // Track which model was used
      },
      totalWeightKg: totalWeight,
      totalCostSEK: totalCostSEK,
      documentType: "waste_report",
      uniqueAddresses,
      uniqueReceivers: 1,
      uniqueMaterials,
      // Store document-level metadata for UI display
      documentMetadata: {
        date: documentDate,
        address: documentAddress || "Okänd adress",
        supplier: documentSupplier,
        receiver: receiver
      },
      _validation: {
        completeness: processedItems.length > 0 ? 95 : 0,
        confidence: 90,
        issues: processedItems.length === 0 ? ["No data extracted from PDF"] : []
      },
      _processingLog: processingLog  // ✅ Include processing log for UI display
    };
    
  } catch (error) {
    log(`❌ PDF extraction failed: ${(error instanceof Error ? error.message : String(error))}`, 'error');
    console.error("❌ PDF extraction failed:", error);
    // Include processingLog in thrown error for debugging
    const enhancedError = new Error(`PDF extraction failed: ${(error instanceof Error ? error.message : String(error))}`);
    (enhancedError as any)._processingLog = processingLog;
    throw enhancedError;
  }
}

// ============================================================================
// MAIN PROCESS ROUTE
// ============================================================================
export async function GET(req: Request) {
  let docId: string | null = null;
  
  try {
    const supabase = createServiceRoleClient();
    
    // Check if document ID is provided in query params (for batch processing)
    const { searchParams } = new URL(req.url);
    const requestedDocId = searchParams.get("id");
    
    let doc: any;
    
    if (requestedDocId) {
      // Process specific document by ID
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", requestedDocId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: `Document ${requestedDocId} not found`
        }, { status: 404 });
      }
      
      // Check if document is in correct status
      if (data.status !== "processing") {
        return NextResponse.json({
          success: false,
          error: `Document ${requestedDocId} is not in 'processing' status (current: ${data.status})`
        }, { status: 400 });
      }
      
      doc = data;
      docId = doc.id;
    } else {
      // Get next document to process (original behavior)
      const { data: fetchedDoc, error } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      if (error || !fetchedDoc) {
        return NextResponse.json({
          success: false,
          message: "No documents to process"
        });
      }
      
      doc = fetchedDoc;
      docId = doc.id;
    }
    
    // Get settings for this document's owner
    const settings = await getSettings(doc.user_id);
    
    console.log(`\n🔄 Processing: ${doc.filename}`);
    
    // Download file from URL or storage path
    let arrayBuffer: ArrayBuffer;
    
    if (doc.url) {
      // Download from URL
      const response = await fetch(doc.url);
      arrayBuffer = await response.arrayBuffer();
    } else if (doc.storage_path) {
      // Download from Supabase Storage
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
    
    let extractedData: any;
    const inferredDomain =
      doc.document_domain ||
      settings.default_document_domain ||
      (settings.industry && settings.industry !== "waste" ? "office_it" : "waste");

    if (inferredDomain === "office_it") {
      const officeResult = await processOfficeDocument({
        documentId: doc.id,
        userId: doc.user_id,
        filename: doc.filename,
        fileBuffer: arrayBuffer,
        settings,
      });

      await supabase
        .from("documents")
        .update({
          status: officeResult.status,
          extracted_data: officeResult.extractedData,
          document_domain: "office_it",
          doc_type: officeResult.classification.finalDocType,
          schema_id: officeResult.classification.schemaId || null,
          schema_version: (officeResult.extractedData as any).schemaVersion || 1,
          classification_confidence: officeResult.classification.modelConfidence,
          review_status: officeResult.status === "approved" ? "approved" : "new",
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      return NextResponse.json({
        success: true,
        file: doc.filename,
        data: officeResult.extractedData,
        status: officeResult.status,
        documentDomain: "office_it",
        docType: officeResult.classification.finalDocType,
        schemaId: officeResult.classification.schemaId || null,
        classification: officeResult.classification,
      });
    }
    
    if (isExcel) {
      
      // EXCEL PROCESSING WITH ADAPTIVE EXTRACTION
      const workbook = XLSX.read(arrayBuffer);
      
      // ✅ FIX: Process ALL sheets, not just the first one!
      console.log(`📊 Excel has ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);
      
      let allData: any[][] = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        
        // Skip empty sheets
        if (sheetData.length === 0) {
          console.log(`   ⏭️ Skipping empty sheet: ${sheetName}`);
          continue;
        }
        
        console.log(`   📄 Sheet "${sheetName}": ${sheetData.length} rows`);
        
        if (allData.length === 0) {
          // First sheet - include header
          allData = sheetData;
        } else {
          // Subsequent sheets - skip header row if it looks like the same structure
          const firstRowLooksLikeHeader = sheetData[0]?.some((cell: any) => 
            String(cell).toLowerCase().match(/datum|material|vikt|adress|kvantitet/)
          );
          
          if (firstRowLooksLikeHeader && sheetData.length > 1) {
            // Skip header, add data rows
            allData = [...allData, ...sheetData.slice(1)];
          } else {
            // Add all rows
            allData = [...allData, ...sheetData];
          }
        }
      }
      
      console.log(`   ✅ Combined total: ${allData.length} rows from all sheets`);
      const jsonData = allData;
      
      // Use adaptive extraction for better handling of chaotic documents!
      const adaptiveResult = await extractAdaptive(
        jsonData as any[][],
        doc.filename,
        settings,
        undefined, // onLog callback
        doc.user_id // Pass userId for API key lookup
      );
      
      // Convert to expected format
      extractedData = {
        ...adaptiveResult,
        totalCostSEK: 0,
        documentType: "waste_report",
        uniqueReceivers: adaptiveResult.uniqueReceivers || 1,
      };
    } else if (isPDF) {
      console.log("📄 PDF file detected - using Claude Vision OCR (Sonnet)");
      
      // PDF PROCESSING WITH CLAUDE VISION
      extractedData = await extractFromPDF(
        arrayBuffer,
        doc.filename,
        settings,
        doc.user_id
      );
    } else {
      throw new Error(`Unsupported file type: ${doc.filename}. Only Excel (.xlsx, .xls) and PDF (.pdf) are supported.`);
    }
    
    // Generate AI summary
    const completeness = extractedData._validation.completeness;
    const confidence = extractedData._validation.confidence || completeness;
    
    // Use adaptive confidence if available (from adaptive extraction)
    const overallConfidence = extractedData.metadata?.confidence 
      ? extractedData.metadata.confidence * 100 
      : confidence;
    
    const rowCount = extractedData.metadata?.processedRows || extractedData.metadata?.aggregatedRows || extractedData.lineItems?.length || 0;
    const aiSummary = completeness >= 95 && overallConfidence >= 90
      ? `✓ Dokument med ${rowCount} rader från ${extractedData.uniqueAddresses} adresser. Total vikt: ${(extractedData.totalWeightKg/1000).toFixed(2)} ton. Data komplett (${overallConfidence.toFixed(0)}% säkerhet) - redo för godkännande.`
      : `⚠️ Dokument med ${rowCount} rader. ${(100 - completeness).toFixed(0)}% data saknas, ${overallConfidence.toFixed(0)}% säkerhet - behöver granskning.`;
    
    extractedData.aiSummary = aiSummary;
    
    // Determine status based on both completeness and confidence
    // Adaptive extraction provides better confidence scores
    const qualityScore = (completeness + overallConfidence) / 2;
    const newStatus = qualityScore >= settings.auto_approve_threshold 
      ? "approved" 
      : "needs_review";
    
    // Detect document type from extracted data
    const { detectDocumentType } = await import("@/lib/schemas");
    const detectedType = extractedData.documentType || detectDocumentType(extractedData, doc.filename);
    extractedData.documentType = detectedType;

    // Save to database
    await supabase
      .from("documents")
      .update({
        status: newStatus,
        extracted_data: extractedData,
        updated_at: new Date().toISOString()
      })
      .eq("id", doc.id);

    // Audit logging (non-blocking)
    import("@/lib/audit").then(({ auditDocumentProcessed }) => {
      auditDocumentProcessed(
        doc.user_id, doc.id,
        extractedData.metadata?.model || 'adaptive',
        overallConfidence / 100,
        detectedType,
      );
    }).catch(() => {});

    // Post-processing duplicate check (non-blocking)
    import("@/lib/duplicate-detection").then(async ({ checkForDuplicate }) => {
      const postDup = await checkForDuplicate(
        doc.user_id, doc.content_hash || '', extractedData, doc.filename,
      );
      if (postDup.isDuplicate && !doc.is_duplicate) {
        await supabase.from("documents").update({
          is_duplicate: true, duplicate_of: postDup.matchedDocumentId,
        }).eq("id", doc.id);
      }
    }).catch(() => {});
    
    console.log(`   Status: ${newStatus}`);
    console.log(`   Completeness: ${completeness.toFixed(1)}%`);
    console.log(`   Confidence: ${overallConfidence.toFixed(1)}%`);
    console.log(`   Quality Score: ${qualityScore.toFixed(1)}%`);
    console.log(`   Model: ${extractedData.metadata?.model || 'adaptive'}`);
    console.log(`   Chunks: ${extractedData.metadata?.chunks || 1}\n`);

    return NextResponse.json({ 
      success: true, 
      file: doc.filename, 
      data: extractedData,
      status: newStatus,
      validation: extractedData._validation
    });

  } catch (error) {
    console.error("❌ Processing error:", error);
    
    // Classify error type for better user feedback
    const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
    let errorType = 'unknown';
    let userFriendlyError = errorMessage;
    
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('api key') || lowerError.includes('authentication') || lowerError.includes('unauthorized')) {
      errorType = 'api_key';
      userFriendlyError = 'API-nyckel saknas eller är ogiltig. Lägg till en giltig nyckel i Inställningar → API-nycklar.';
    } else if (lowerError.includes('rate limit') || lowerError.includes('quota') || lowerError.includes('429')) {
      errorType = 'rate_limit';
      userFriendlyError = 'Rate limit nådd. Vänta en stund och försök igen, eller använd en annan modell.';
    } else if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      errorType = 'timeout';
      userFriendlyError = 'Timeout vid bearbetning. Dokumentet kan vara för stort. Försök med en snabbare modell.';
    } else if (lowerError.includes('server') || lowerError.includes('500') || lowerError.includes('503')) {
      errorType = 'server_error';
      userFriendlyError = 'AI-servern har tillfälliga problem. Försök igen om en stund.';
    } else if (lowerError.includes('json') || lowerError.includes('parse')) {
      errorType = 'invalid_response';
      userFriendlyError = 'Kunde inte tolka AI-svaret. Dokumentformatet kan vara osupporterat.';
    }
    
    // Update document status to error WITH detailed error info
    if (docId) {
      try {
        const supabase = createServiceRoleClient();
        await supabase
          .from("documents")
          .update({ 
            status: "error", 
            updated_at: new Date().toISOString(),
            extracted_data: {
              _error: userFriendlyError,
              _errorType: errorType,
              _errorDetails: errorMessage,
              _errorTimestamp: new Date().toISOString(),
              _suggestions: getSuggestions(errorType)
            }
          })
          .eq("id", docId);
        console.log(`❌ Updated document ${docId} to error status: ${errorType}`);
      } catch (updateError) {
        console.error("Failed to update error status:", updateError);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: userFriendlyError,
      errorType,
      errorDetails: errorMessage
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const body = await req.json();
    const documentId = body?.id || body?.documentId;
    if (!documentId) {
      return NextResponse.json({ success: false, error: "Missing document id" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", documentId)
      .single();

    if (docError || !doc || doc.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    await supabase
      .from("documents")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    const result = await processDocumentDirect(documentId);
    return NextResponse.json({
      success: result.success,
      status: result.status,
      error: result.error,
      data: result.extractedData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Helper function to get suggestions based on error type
function getSuggestions(errorType: string): string[] {
  switch (errorType) {
    case 'api_key':
      return [
        'Kontrollera att din API-nyckel är korrekt i Inställningar → API-nycklar',
        'Skapa en ny API-nyckel hos din AI-leverantör',
        'Prova en annan modell (Google Gemini, OpenAI, eller Anthropic)'
      ];
    case 'rate_limit':
      return [
        'Vänta 1-2 minuter innan du försöker igen',
        'Byt till en annan AI-modell',
        'Behandla färre dokument åt gången'
      ];
    case 'timeout':
      return [
        'Använd en snabbare modell (t.ex. Gemini Flash eller Haiku)',
        'Dela upp stora dokument i mindre delar',
        'Försök igen vid lägre belastning'
      ];
    case 'server_error':
      return [
        'Försök igen om några minuter',
        'Prova en annan AI-leverantör',
        'Kontrollera status-sidan för din AI-leverantör'
      ];
    case 'invalid_response':
      return [
        'Kontrollera att dokumentet är läsbart',
        'Prova med en mer kapabel modell (t.ex. Claude Sonnet eller GPT-4o)',
        'Ladda upp dokumentet i ett annat format'
      ];
    default:
      return [
        'Försök igen',
        'Kontrollera dina API-nycklar',
        'Prova en annan modell'
      ];
  }
}
