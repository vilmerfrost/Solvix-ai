/**
 * Google Gemini Extraction Adapter
 * Uses Google's Generative AI API for document extraction
 */

import { 
  ExtractionAdapter, 
  ExtractionRequest, 
  ExtractionResult, 
  ExtractedRow,
  buildExtractionPrompt,
  parseExtractionResponse
} from '../types';
import { getModelById, estimateCost } from '@/config/models';

export class GeminiAdapter implements ExtractionAdapter {
  provider = 'google';
  modelId: string;
  
  constructor(modelId: string = 'gemini-3-flash') {
    this.modelId = modelId;
  }

  supportsContentType(contentType: string): boolean {
    return ['excel', 'pdf', 'image'].includes(contentType);
  }

  async extract(request: ExtractionRequest, apiKey: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const model = getModelById(this.modelId);
    
    if (!model) {
      return {
        success: false,
        items: [],
        model: this.modelId,
        provider: this.provider,
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        processingTimeMs: Date.now() - startTime,
        error: `Unknown model: ${this.modelId}`
      };
    }

    try {
      // Build the prompt
      const prompt = buildExtractionPrompt(
        typeof request.content === 'string' ? request.content : request.content.toString('utf-8'),
        request.filename,
        request.settings?.known_receivers?.[0] || 'Unknown',
        request.settings,
        request.customInstructions
      );

      // Prepare the request body for Gemini API
      const requestBody: any = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: request.settings?.extraction_max_tokens || 16384,
        }
      };

      // If content is binary (PDF/image), add as inline data
      if (request.contentType === 'pdf' && Buffer.isBuffer(request.content)) {
        requestBody.contents[0].parts.unshift({
          inline_data: {
            mime_type: 'application/pdf',
            data: request.content.toString('base64')
          }
        });
      } else if (request.contentType === 'image' && Buffer.isBuffer(request.content)) {
        requestBody.contents[0].parts.unshift({
          inline_data: {
            mime_type: 'image/png', // or detect from content
            data: request.content.toString('base64')
          }
        });
      }

      // Extract actual model name from apiModelId (format: "google/gemini-3-flash-preview")
      const actualModelName = model.apiModelId.includes('/') 
        ? model.apiModelId.split('/')[1] 
        : model.apiModelId;

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${actualModelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Get token usage
      const inputTokens = data.usageMetadata?.promptTokenCount || 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
      
      // Parse the response
      const parsed = parseExtractionResponse(text);
      
      if (!parsed || !parsed.items || parsed.items.length === 0) {
        return {
          success: false,
          items: [],
          model: this.modelId,
          provider: this.provider,
          tokensUsed: { input: inputTokens, output: outputTokens },
          cost: estimateCost(inputTokens, outputTokens, this.modelId),
          processingTimeMs: Date.now() - startTime,
          error: 'Failed to parse extraction response',
          rawResponse: text
        };
      }

      // Validate and normalize items
      const items: ExtractedRow[] = parsed.items.map((item: any) => ({
        date: item.date || '',
        location: item.location || item.address || '',
        material: item.material || '',
        weightKg: parseFloat(item.weightKg) || 0,
        unit: item.unit || 'kg',
        receiver: item.receiver || '',
        isHazardous: item.isHazardous === true,
        confidence: item.confidence
      }));

      return {
        success: true,
        items,
        model: this.modelId,
        provider: this.provider,
        tokensUsed: { input: inputTokens, output: outputTokens },
        cost: estimateCost(inputTokens, outputTokens, this.modelId),
        processingTimeMs: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        items: [],
        model: this.modelId,
        provider: this.provider,
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        processingTimeMs: Date.now() - startTime,
        error: error.message || 'Unknown error during Gemini extraction'
      };
    }
  }
}

// Export a factory function
export function createGeminiAdapter(modelId?: string): GeminiAdapter {
  return new GeminiAdapter(modelId);
}
