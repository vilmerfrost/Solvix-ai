/**
 * Core document processing function
 * Can be called directly from any route without HTTP requests
 * Supports both Excel and PDF files with model selection
 * 
 * PDF extraction now routes through the extraction router,
 * supporting all providers (Gemini, GPT, Claude) based on user's selection.
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { extractAdaptive } from "@/lib/adaptive-extraction";
import { extractWithRetryAndFallback, getUserPreferredModel } from "@/lib/extraction/router";
import { ExtractionRequest } from "@/lib/extraction/types";
import type { 
  DocumentStatus, 
  ExtractedDocumentData, 
  UserSettings, 
  LineItem,
  SpreadsheetData,
  CellValue
} from "@/lib/types";
import * as XLSX from "xlsx";

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
 * Extract data from PDF using the extraction router
 * Supports all providers (Gemini, GPT, Claude) based on user's selection
 */
async function extractFromPDF(
  pdfBuffer: ArrayBuffer,
  filename: string,
  settings: ProcessingSettings,
  userId: string,
  modelId: string
): Promise<ExtractedDocumentData> {
  console.log(`📄 PDF EXTRACTION: ${filename}`);
  console.log(`   Using model: ${modelId}`);
  
  // Convert ArrayBuffer to Buffer for the router
  const buffer = Buffer.from(pdfBuffer);
  console.log(`✓ PDF prepared (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
  
  // Infer receiver from filename
  let receiver = "Okänd mottagare";
  const fn = filename.toLowerCase();
  if (fn.includes('ragn-sells') || fn.includes('ragnsells')) receiver = "Ragn-Sells";
  else if (fn.includes('renova')) receiver = "Renova";
  else if (fn.includes('nsr')) receiver = "NSR";
  
  // Build extraction request for the router
  const request: ExtractionRequest = {
    content: buffer,
    contentType: 'pdf',
    filename: filename,
    customInstructions: settings.custom_instructions,
    settings: {
      material_synonyms: settings.material_synonyms,
      known_receivers: [receiver],
      extraction_max_tokens: 16384
    }
  };
  
  // Use the extraction router with retry and fallback
  const result = await extractWithRetryAndFallback(
    request,
    userId,
    modelId,
    {
      maxRetries: 2,
      fallbackToOtherProviders: true,
      onLog: (msg, level) => console.log(`   ${msg}`)
    }
  );
  
  if (!result.success) {
    throw new Error(result.error || "PDF extraction failed");
  }
  
  console.log(`✓ Extraction complete: ${result.items.length} items via ${result.provider}`);
  
  // Extract date from filename for fallback
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const filenameDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  
  // Transform router result to expected format
  const lineItems = result.items.map(item => ({
    date: item.date || filenameDate,
    location: item.location || "Okänd adress",
    material: item.material || "Okänt material",
    weightKg: item.weightKg || 0,
    unit: item.unit || "Kg",
    receiver: item.receiver || receiver,
    isHazardous: item.isHazardous || false
  }));
  
  // Aggregate duplicates
  const grouped = new Map<string, LineItem>();
  for (const item of lineItems) {
    const key = `${item.date}|${item.location}|${item.material}|${item.receiver}`;
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.weightKg += item.weightKg;
    } else {
      grouped.set(key, { ...item });
    }
  }
  
  const aggregated = Array.from(grouped.values());
  const totalWeight = aggregated.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const uniqueAddresses = new Set(aggregated.map(item => item.location)).size;
  const uniqueMaterials = new Set(aggregated.map(item => item.material)).size;
  
  console.log(`✅ PDF extraction complete: ${aggregated.length} items, ${(totalWeight/1000).toFixed(2)} ton`);
  
  return {
    lineItems: aggregated,
    metadata: {
      totalRows: lineItems.length,
      extractedRows: lineItems.length,
      aggregatedRows: aggregated.length,
      model: result.model,
      provider: result.provider,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      processingTimeMs: result.processingTimeMs
    },
    totalWeightKg: totalWeight,
    totalCostSEK: result.cost,
    documentType: "waste_report",
    uniqueAddresses,
    uniqueReceivers: 1,
    uniqueMaterials,
    documentMetadata: {
      date: filenameDate,
      address: aggregated[0]?.location || "Okänd adress",
      supplier: "Okänd leverantör",
      receiver: receiver
    },
    _validation: {
      completeness: lineItems.length > 0 ? 95 : 0,
      confidence: 90,
      issues: lineItems.length === 0 ? ["No data extracted from PDF"] : []
    }
  };
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
    
    // Get settings and user's preferred model
    const settings = await getSettings(doc.user_id);
    const modelId = options.modelId || await getUserPreferredModel(doc.user_id);
    
    // Add custom instructions to settings if provided
    if (options.customInstructions) {
      settings.custom_instructions = options.customInstructions;
    }
    
    console.log(`   Filename: ${doc.filename}`);
    console.log(`   Model: ${modelId}`);
    
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
    
    let extractedData: ExtractedDocumentData;
    
    if (isExcel) {
      console.log(`   📊 Excel file - using adaptive extraction`);
      
      const workbook = XLSX.read(arrayBuffer);
      let allData: SpreadsheetData = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as SpreadsheetData;
        
        if (sheetData.length === 0) continue;
        
        if (allData.length === 0) {
          allData = sheetData;
        } else {
          const firstRowLooksLikeHeader = sheetData[0]?.some((cell: CellValue) => 
            String(cell).toLowerCase().match(/datum|material|vikt|adress|kvantitet/)
          );
          
          if (firstRowLooksLikeHeader && sheetData.length > 1) {
            allData = [...allData, ...sheetData.slice(1)];
          } else {
            allData = [...allData, ...sheetData];
          }
        }
      }
      
      const adaptiveResult = await extractAdaptive(
        allData,
        doc.filename,
        settings,
        undefined,
        doc.user_id
      );
      
      extractedData = {
        ...adaptiveResult,
        totalCostSEK: 0,
        documentType: "waste_report",
        uniqueReceivers: adaptiveResult.uniqueReceivers || 1,
      };
      
    } else if (isPDF) {
      console.log(`   📄 PDF file - using ${modelId} via extraction router`);
      
      extractedData = await extractFromPDF(
        arrayBuffer,
        doc.filename,
        settings,
        doc.user_id,
        modelId
      );
      
    } else {
      throw new Error(`Unsupported file type: ${doc.filename}`);
    }
    
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
