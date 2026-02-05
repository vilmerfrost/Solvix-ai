/**
 * Document Router Module
 * 
 * Uses Gemini 3 Flash to assess document quality and complexity,
 * then determines optimal model routing.
 */

import { getGeminiClientForUser, MODELS } from "@/lib/ai-clients";
import type { QualityAssessment } from "@/lib/types";

// =============================================================================
// MAIN ROUTING FUNCTION
// =============================================================================

/**
 * Assess document quality and determine optimal extraction route
 */
export async function assessDocumentQuality(
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<QualityAssessment> {
  // First, determine document type from extension
  const extension = filename.toLowerCase().split('.').pop() || '';
  const documentType = getDocumentType(extension);
  
  // For Excel files, always route to Gemini Flash
  if (documentType === 'excel') {
    return {
      documentType: 'excel',
      complexity: 'moderate',
      recommendedRoute: 'gemini-flash',
      confidence: 0.95,
      reasoning: 'Excel files are best processed with Gemini Flash for tabular data extraction',
      hasTabularData: true,
      hasScannedContent: false,
    };
  }
  
  // For PDFs, assess complexity using Gemini Flash
  if (documentType === 'pdf') {
    return await assessPDFWithGemini(buffer, filename, userId);
  }
  
  // For images, route to Mistral OCR
  if (documentType === 'image') {
    return {
      documentType: 'image',
      complexity: 'complex',
      recommendedRoute: 'mistral-ocr',
      confidence: 0.85,
      reasoning: 'Image files require OCR processing, routing to Mistral OCR',
      hasTabularData: false,
      hasScannedContent: true,
    };
  }
  
  // Unknown file type
  return {
    documentType: 'unknown',
    complexity: 'complex',
    recommendedRoute: 'mistral-ocr',
    confidence: 0.5,
    reasoning: 'Unknown file type, attempting OCR extraction',
    hasTabularData: false,
    hasScannedContent: false,
  };
}

/**
 * Route document based on assessment
 */
export function routeDocument(assessment: QualityAssessment): 'mistral-ocr' | 'gemini-flash' {
  return assessment.recommendedRoute;
}

// =============================================================================
// PDF ASSESSMENT
// =============================================================================

/**
 * Assess PDF complexity using Gemini Flash
 */
async function assessPDFWithGemini(
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<QualityAssessment> {
  try {
    const { client } = await getGeminiClientForUser(userId);
    
    // Convert buffer to base64 for vision API
    const base64Data = buffer.toString('base64');
    
    const prompt = `Analyze this PDF document and assess its characteristics for data extraction.

Document: ${filename}

Evaluate:
1. Is this a scanned/image PDF or a text-based PDF?
2. Does it contain tabular data (tables, spreadsheets)?
3. Document language (Swedish, Norwegian, Danish, Finnish, English)?
4. Estimated number of data rows if tables are present
5. Overall complexity (simple, moderate, complex)

For WASTE MANAGEMENT documents, look for:
- Material types and names
- Weight/quantity data
- Dates and addresses
- Receiver information

OUTPUT FORMAT (JSON only, no markdown):
{
  "isScanned": true/false,
  "hasTabularData": true/false,
  "detectedLanguage": "Swedish",
  "estimatedRows": 50,
  "complexity": "simple|moderate|complex",
  "reasoning": "Brief explanation",
  "recommendedRoute": "mistral-ocr|gemini-flash"
}

Routing guidance:
- Scanned PDFs → mistral-ocr (better OCR)
- Text PDFs with simple tables → gemini-flash (faster)
- Complex multi-page PDFs → mistral-ocr (more thorough)`;

    const response = await client.chat.completions.create({
      model: MODELS.QUALITY_ASSESSMENT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${base64Data}` }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 1024,
    });
    
    const text = response.choices[0]?.message?.content || "";
    const parsed = parseJsonResponse(text);
    
    if (parsed) {
      const isScanned = Boolean(parsed.isScanned);
      const complexity = parseComplexity(parsed.complexity);
      
      // Determine route based on assessment
      let recommendedRoute: 'mistral-ocr' | 'gemini-flash';
      if (isScanned || complexity === 'complex') {
        recommendedRoute = 'mistral-ocr';
      } else {
        recommendedRoute = parsed.recommendedRoute === 'gemini-flash' ? 'gemini-flash' : 'mistral-ocr';
      }
      
      return {
        documentType: 'pdf',
        complexity,
        recommendedRoute,
        confidence: 0.85,
        reasoning: String(parsed.reasoning || 'Assessed by Gemini Flash'),
        detectedLanguage: parsed.detectedLanguage ? String(parsed.detectedLanguage) : undefined,
        estimatedRows: typeof parsed.estimatedRows === 'number' ? parsed.estimatedRows : undefined,
        hasTabularData: Boolean(parsed.hasTabularData),
        hasScannedContent: isScanned,
      };
    }
    
    // Fallback if parsing failed
    return createDefaultPDFAssessment(filename);
    
  } catch (error) {
    console.warn('PDF assessment failed, using default routing:', error);
    return createDefaultPDFAssessment(filename);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get document type from file extension
 */
function getDocumentType(extension: string): 'pdf' | 'excel' | 'image' | 'unknown' {
  if (['pdf'].includes(extension)) return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(extension)) return 'excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'].includes(extension)) return 'image';
  return 'unknown';
}

/**
 * Parse complexity string
 */
function parseComplexity(value: unknown): 'simple' | 'moderate' | 'complex' {
  const str = String(value).toLowerCase();
  if (str === 'simple') return 'simple';
  if (str === 'complex') return 'complex';
  return 'moderate';
}

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
 * Create default PDF assessment when assessment fails
 */
function createDefaultPDFAssessment(filename: string): QualityAssessment {
  // Default to Mistral OCR for PDFs (more reliable)
  return {
    documentType: 'pdf',
    complexity: 'moderate',
    recommendedRoute: 'mistral-ocr',
    confidence: 0.7,
    reasoning: 'Default routing to Mistral OCR for PDF processing',
    hasTabularData: true, // Assume waste documents have tables
    hasScannedContent: false,
  };
}
