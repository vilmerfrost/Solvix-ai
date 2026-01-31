/**
 * Anthropic Claude Extraction Adapter
 * Uses Anthropic's Claude API for document extraction
 */

import Anthropic from "@anthropic-ai/sdk";
import { 
  ExtractionAdapter, 
  ExtractionRequest, 
  ExtractionResult, 
  ExtractedRow,
  RawExtractedItem,
  buildExtractionPrompt,
  parseExtractionResponse
} from '../types';
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { getModelById, estimateCost } from '@/config/models';

export class AnthropicAdapter implements ExtractionAdapter {
  provider = 'anthropic';
  modelId: string;
  
  constructor(modelId: string = 'claude-sonnet-4.5') {
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
      // Create Anthropic client with the user's API key
      const anthropic = new Anthropic({ apiKey });

      // Build the prompt
      const prompt = buildExtractionPrompt(
        typeof request.content === 'string' ? request.content : request.content.toString('utf-8'),
        request.filename,
        request.settings?.known_receivers?.[0] || 'Unknown',
        request.settings,
        request.customInstructions
      );

      // Build content array using Anthropic SDK types
      const content: ContentBlockParam[] = [];
      
      // For PDFs/images, add as base64
      if ((request.contentType === 'pdf' || request.contentType === 'image') && Buffer.isBuffer(request.content)) {
        // Anthropic requires specific media types for images
        const mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 
          request.contentType === 'pdf' ? 'image/png' : 'image/png'; // PDFs are converted to images
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: request.content.toString('base64')
          }
        });
      }

      // Add the text prompt
      content.push({
        type: 'text',
        text: prompt
      });

      // Extract actual model name from apiModelId (format: "anthropic/claude-sonnet-4.5")
      const actualModelName = model.apiModelId.includes('/') 
        ? model.apiModelId.split('/')[1] 
        : model.apiModelId;

      // Call Claude API
      const response = await anthropic.messages.create({
        model: actualModelName,
        max_tokens: request.settings?.extraction_max_tokens || 16384,
        temperature: 0,
        messages: [{
          role: 'user',
          content
        }]
      });

      // Extract text from response
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      
      // Get token usage
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      
      // Parse the response
      const parsed = parseExtractionResponse(text);
      
      if (!parsed || !parsed.items || parsed.items.length === 0) {
        return {
          success: false,
          items: [],
          model: this.modelId,
          provider: this.provider,
          tokensUsed: { input: inputTokens, output: outputTokens },
          cost: estimateCost(inputTokens, outputTokens, this.modelId).SEK,
          processingTimeMs: Date.now() - startTime,
          error: 'Failed to parse extraction response',
          rawResponse: text
        };
      }

      // Validate and normalize items
      const items: ExtractedRow[] = parsed.items.map((item: RawExtractedItem) => ({
        date: item.date || '',
        location: item.location || item.address || '',
        material: item.material || '',
        weightKg: parseFloat(String(item.weightKg)) || 0,
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
        cost: estimateCost(inputTokens, outputTokens, this.modelId).SEK,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        items: [],
        model: this.modelId,
        provider: this.provider,
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error during Anthropic extraction'
      };
    }
  }
}

// Export a factory function
export function createAnthropicAdapter(modelId?: string): AnthropicAdapter {
  return new AnthropicAdapter(modelId);
}
