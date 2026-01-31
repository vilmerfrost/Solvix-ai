/**
 * Common types for extraction adapters
 */

export interface ExtractedRow {
  date: string;
  location: string;
  material: string;
  weightKg: number;
  unit: string;
  receiver: string;
  isHazardous: boolean;
  confidence?: number;
}

export interface ExtractionRequest {
  content: string | Buffer;
  contentType: 'excel' | 'pdf' | 'image';
  filename: string;
  customInstructions?: string;
  settings?: ExtractionSettings;
}

export interface ExtractionSettings {
  material_synonyms?: Record<string, string[]>;
  known_receivers?: string[];
  extraction_max_tokens?: number;
}

export interface ExtractionResult {
  success: boolean;
  items: ExtractedRow[];
  model: string;
  provider: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
  processingTimeMs: number;
  error?: string;
  rawResponse?: string;
}

export interface DocumentStructure {
  confidence: number;
  detectedLanguage?: string;
  dateColumn?: string;
  locationColumn?: string;
  materialColumn?: string;
  weightColumn?: string;
  unitColumn?: string;
  receiverColumn?: string;
  hazardousColumn?: string;
}

/**
 * Base adapter interface that all providers must implement
 */
export interface ExtractionAdapter {
  provider: string;
  modelId: string;
  
  /**
   * Extract data from document content
   */
  extract(request: ExtractionRequest, apiKey: string): Promise<ExtractionResult>;
  
  /**
   * Check if this adapter supports the given content type
   */
  supportsContentType(contentType: string): boolean;
}

/**
 * Common prompt builder for consistent extraction across providers
 */
export function buildExtractionPrompt(
  tsv: string,
  filename: string,
  receiver: string,
  settings?: ExtractionSettings,
  customInstructions?: string
): string {
  // Material synonyms from settings
  const materialSynonyms = settings?.material_synonyms
    ? Object.entries(settings.material_synonyms)
        .map(([std, syns]) => `${std}: ${(syns as string[]).join(", ")}`)
        .join("\n")
    : "";

  // Extract date from filename
  const dateMatch = filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const filenameDate = dateMatch ? dateMatch[0].replace(/[-_]/g, '-') : null;

  return `Extract ALL rows from this waste document table to clean JSON.

═══════════════════════════════════════════════════════════════════════════════
MULTI-LANGUAGE SUPPORT
═══════════════════════════════════════════════════════════════════════════════
Document may be in: Swedish, Norwegian, Danish, Finnish, or English.
Recognize column names and values in any of these languages.
Output data in ENGLISH field names with original values preserved.

═══════════════════════════════════════════════════════════════════════════════
DATE HANDLING
═══════════════════════════════════════════════════════════════════════════════
⚠️ EXCEL SERIAL DATES: If date is a NUMBER (like 45294), convert it!
   Formula: days since 1899-12-30. Example: 45294 = 2024-01-02

⚠️ CRITICAL - PERIOD/DATE RANGE HANDLING:
   If the document shows a PERIOD (date range), ALWAYS extract the END DATE!
   Examples:
   - "Period 20251201-20251231" → extract "2025-12-31" (END date!)
   - "Period: 2025-12-01 - 2025-12-31" → extract "2025-12-31" (END date!)
   
   The END date represents when the work was COMPLETED ("Utförtdatum").
   
Recognize date formats in all languages and output as YYYY-MM-DD.
If no date found, use fallback: ${filenameDate || 'today\'s date'}

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
TABLE DATA
═══════════════════════════════════════════════════════════════════════════════
${tsv}

${customInstructions ? `═══════════════════════════════════════════════════════════════════════════════
CUSTOM INSTRUCTIONS (HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════════════════
${customInstructions}

⚠️ These instructions override any conflicting rules above.
═══════════════════════════════════════════════════════════════════════════════
` : ''}═══════════════════════════════════════════════════════════════════════════════
JSON OUTPUT FORMAT (no markdown, no backticks)
═══════════════════════════════════════════════════════════════════════════════
{"items":[{"date":"2024-01-16","location":"Address","material":"Material","weightKg":185,"unit":"Kg","receiver":"${receiver}","isHazardous":false}]}

CRITICAL:
1. Extract ALL rows from the data!
2. Output dates as YYYY-MM-DD
3. Convert all weights to kg
4. Set isHazardous:true if hazardous waste indicator present`;
}

/**
 * Anthropic content block types
 */
export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type AnthropicContentBlock = AnthropicTextBlock | AnthropicImageBlock;

/**
 * OpenAI message types
 */
export interface OpenAIVisionContent {
  type: 'image_url' | 'text';
  image_url?: { url: string };
  text?: string;
}

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | OpenAIVisionContent[];
}

/**
 * Gemini request body type
 */
export interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

/**
 * Raw extracted item from AI response (before normalization)
 */
export interface RawExtractedItem {
  date?: string;
  location?: string;
  address?: string;
  material?: string;
  weightKg?: string | number;
  unit?: string;
  receiver?: string;
  isHazardous?: boolean;
  confidence?: number;
}

/**
 * Parsed extraction response
 */
export interface ParsedExtractionResponse {
  items: RawExtractedItem[];
}

/**
 * Parse JSON response with multiple fallback strategies
 */
export function parseExtractionResponse(text: string): ParsedExtractionResponse | null {
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
  } catch (e1) {
    // Strategy 2: Find first { and last }
    try {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      // Strategy 3: Look for items array
      try {
        const itemsMatch = cleaned.match(/"items"\s*:\s*\[([\s\S]*?)\]/);
        if (itemsMatch) {
          return JSON.parse(`{"items":[${itemsMatch[1]}]}`);
        }
      } catch (e3) {
        // All strategies failed
      }
    }
  }

  return null;
}
