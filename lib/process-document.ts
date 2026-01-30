/**
 * Core document processing function
 * Can be called directly from any route without HTTP requests
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { extractAdaptive } from "@/lib/adaptive-extraction";
import * as XLSX from "xlsx";

// Import settings getter
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

export interface ProcessResult {
  success: boolean;
  documentId: string;
  filename: string;
  status: string;
  error?: string;
  extractedData?: any;
}

/**
 * Process a single document by ID
 */
export async function processDocument(documentId: string): Promise<ProcessResult> {
  const supabase = createServiceRoleClient();
  
  console.log(`\n🔄 Processing document: ${documentId}`);
  
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
    
    let extractedData: any;
    
    if (isExcel) {
      console.log(`   📊 Excel file - using adaptive extraction`);
      
      const workbook = XLSX.read(arrayBuffer);
      let allData: any[][] = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        
        if (sheetData.length === 0) continue;
        
        if (allData.length === 0) {
          allData = sheetData;
        } else {
          const firstRowLooksLikeHeader = sheetData[0]?.some((cell: any) => 
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
        allData as any[][],
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
      console.log(`   📄 PDF file - PDF processing not implemented in direct call`);
      // PDF processing would need the full extractFromPDF function
      // For now, return an error to indicate PDF needs the full process route
      throw new Error("PDF processing requires full process route - please retry");
      
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
    
  } catch (error: any) {
    console.error(`   ❌ Processing error: ${error.message}`);
    
    // Update document to error status
    await supabase
      .from("documents")
      .update({
        status: "error",
        updated_at: new Date().toISOString(),
        extracted_data: {
          _error: error.message,
          _errorTimestamp: new Date().toISOString()
        }
      })
      .eq("id", documentId);
    
    return {
      success: false,
      documentId,
      filename: "Unknown",
      status: "error",
      error: error.message
    };
  }
}

/**
 * Process multiple documents sequentially
 */
export async function processBatch(documentIds: string[]): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < documentIds.length; i++) {
    console.log(`\n📦 Batch progress: ${i + 1}/${documentIds.length}`);
    const result = await processDocument(documentIds[i]);
    results.push(result);
  }
  
  return results;
}
