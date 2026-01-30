/**
 * OpenAI GPT Extraction Adapter
 * Uses OpenAI's API for document extraction
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

export class OpenAIAdapter implements ExtractionAdapter {
  provider = 'openai';
  modelId: string;
  
  constructor(modelId: string = 'gpt-5.2-chat') {
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

      // Build messages array
      const messages: any[] = [];
      
      // For PDFs/images, use vision capability
      if ((request.contentType === 'pdf' || request.contentType === 'image') && Buffer.isBuffer(request.content)) {
        const mimeType = request.contentType === 'pdf' ? 'application/pdf' : 'image/png';
        const base64Data = request.content.toString('base64');
        
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        });
      } else {
        messages.push({
          role: 'user',
          content: prompt
        });
      }

      // Extract actual model name from apiModelId (format: "openai/gpt-5.2-chat")
      const actualModelName = model.apiModelId.includes('/') 
        ? model.apiModelId.split('/')[1] 
        : model.apiModelId;

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: actualModelName,
          messages,
          temperature: 0,
          max_tokens: request.settings?.extraction_max_tokens || 16384,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from response
      const text = data.choices?.[0]?.message?.content || '';
      
      // Get token usage
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      
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
        error: error.message || 'Unknown error during OpenAI extraction'
      };
    }
  }
}

// Export a factory function
export function createOpenAIAdapter(modelId?: string): OpenAIAdapter {
  return new OpenAIAdapter(modelId);
}
