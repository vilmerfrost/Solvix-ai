/**
 * Mistral AI Extraction Adapter
 * Uses Mistral's API for document extraction (including Pixtral vision models)
 */

import {
  ExtractionAdapter,
  ExtractionRequest,
  ExtractionResult,
  buildExtractionPrompt,
  parseExtractionResponse,
} from "../types";
import { getModelById, estimateCost } from "@/config/models";

export class MistralAdapter implements ExtractionAdapter {
  provider = "mistral";
  modelId: string;

  constructor(modelId: string = "pixtral-large") {
    this.modelId = modelId;
  }

  supportsContentType(contentType: string): boolean {
    return ["excel", "pdf", "image"].includes(contentType);
  }

  async extract(
    request: ExtractionRequest,
    apiKey: string
  ): Promise<ExtractionResult> {
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
        error: `Unknown model: ${this.modelId}`,
      };
    }

    try {
      const prompt = buildExtractionPrompt(
        typeof request.content === "string"
          ? request.content
          : request.content.toString("utf-8"),
        request.filename,
        request.settings?.known_receivers?.[0] || "Unknown",
        request.settings,
        request.customInstructions
      );

      // Build messages (Mistral uses OpenAI-compatible format)
      const messages: any[] = [];

      // For PDFs/images with vision models (Pixtral)
      if (
        (request.contentType === "pdf" || request.contentType === "image") &&
        Buffer.isBuffer(request.content)
      ) {
        const mimeType =
          request.contentType === "pdf" ? "application/pdf" : "image/png";
        const base64Data = request.content.toString("base64");

        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
            },
            { type: "text", text: prompt },
          ],
        });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.apiModelId,
            messages,
            temperature: 0,
            max_tokens: request.settings?.extraction_max_tokens || 16384,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 401) {
          throw new Error(
            "Invalid Mistral API key. Please check your key in Settings."
          );
        }
        if (response.status === 429) {
          throw new Error(
            "Mistral rate limit exceeded. Please wait a moment and try again."
          );
        }
        if (response.status >= 500) {
          throw new Error(
            `Mistral server error (${response.status}). Please try again later.`
          );
        }
        throw new Error(
          `Mistral API error (${response.status}): ${errorBody}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";

      if (!text) {
        throw new Error("Empty response from Mistral");
      }

      const tokensUsed = {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
      };

      const cost = estimateCost(
        tokensUsed.input,
        tokensUsed.output,
        this.modelId
      );

      const parsed = parseExtractionResponse(text);
      const items = (parsed?.items || []).map((item) => ({
        date: item.date || "",
        location: item.location || item.address || "",
        material: item.material || "",
        weightKg: typeof item.weightKg === "string" ? parseFloat(item.weightKg) || 0 : item.weightKg || 0,
        unit: item.unit || "Kg",
        receiver: item.receiver || "",
        isHazardous: item.isHazardous || false,
        confidence: item.confidence,
      }));

      return {
        success: true,
        items,
        model: this.modelId,
        provider: this.provider,
        tokensUsed,
        cost: cost.USD,
        processingTimeMs: Date.now() - startTime,
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
        error:
          error instanceof Error
            ? error.message
            : "Mistral extraction failed",
      };
    }
  }
}

export function createMistralAdapter(modelId?: string): MistralAdapter {
  return new MistralAdapter(modelId);
}
