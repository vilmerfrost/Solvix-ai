/**
 * Multi-Model Extraction Module
 * 
 * Export all extraction-related utilities for easy importing
 */

// Core types
export type { 
  ExtractionAdapter,
  ExtractionRequest,
  ExtractionResult,
  ExtractedRow,
  DocumentStructure,
  ExtractionSettings
} from './types';

// Common utilities
export { 
  buildExtractionPrompt, 
  parseExtractionResponse 
} from './types';

// Model router
export { 
  extractWithModel,
  extractWithAPIKey,
  getUserPreferredModel,
  getUserCustomInstructions,
  getAPIKeyForModel,
  getAPIKeyForProvider,
  getConfiguredProviders,
  getAvailableModels,
  setPreferredModel,
  setCustomInstructions
} from './router';

// Adapters (if needed directly)
export { createGeminiAdapter } from './adapters/gemini';
export { createOpenAIAdapter } from './adapters/openai';
export { createAnthropicAdapter } from './adapters/anthropic';
