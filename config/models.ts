/**
 * AI Model Registry
 * Defines all available models for document extraction with their specs and pricing
 * 
 * Last updated: 2026-01-30
 * Prices in SEK (1 USD ≈ 10.5 SEK)
 */

export type AIProvider = 'google' | 'openai' | 'anthropic';

// Conversion rate
const USD_TO_SEK = 10.5;

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  apiModelId: string; // The actual model ID to send to the API
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing: {
    inputUSD: number;   // USD per 1M tokens
    outputUSD: number;  // USD per 1M tokens
    inputSEK: number;   // SEK per 1M tokens
    outputSEK: number;  // SEK per 1M tokens
  };
  estimatedCostPerDoc: {
    USD: number;  // Estimated cost per document in USD
    SEK: number;  // Estimated cost per document in SEK
  };
  contextWindow: number;
  recommended: boolean;
  supportsVision: boolean;
  ocrAccuracy: {
    digital: number;    // % accuracy on digital PDFs
    scanned: number;    // % accuracy on scanned documents
    handwritten: number; // % accuracy on handwritten text
  };
}

// Helper to calculate estimated cost per document
// Assumes: ~2,000 input tokens (document), ~500 output tokens (JSON result)
function calcDocCost(inputPerM: number, outputPerM: number): { USD: number; SEK: number } {
  const inputTokens = 2000;
  const outputTokens = 500;
  const costUSD = (inputTokens / 1_000_000) * inputPerM + (outputTokens / 1_000_000) * outputPerM;
  return {
    USD: Math.round(costUSD * 10000) / 10000,
    SEK: Math.round(costUSD * USD_TO_SEK * 1000) / 1000
  };
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  logo: string; // URL or emoji
  apiKeyUrl: string;
  apiKeyPrefix: string;
  description: string;
}

// Provider information
export const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  google: {
    id: 'google',
    name: 'Google AI',
    logo: '🔷',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    apiKeyPrefix: 'AIza',
    description: 'Google Gemini models - best for document extraction'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    logo: '🟢',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyPrefix: 'sk-',
    description: 'GPT models - excellent for handwritten text'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '🟠',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPrefix: 'sk-ant-',
    description: 'Claude models - great for complex reasoning'
  }
};

// Model tier type for filtering
export type ModelTier = 'fast' | 'balanced' | 'premium';

// Extended model interface with tier
export interface AIModelWithTier extends AIModel {
  tier: ModelTier;
  tierLabel: string;
  speedRating: number; // 1-5, 5 being fastest
  qualityRating: number; // 1-5, 5 being best quality
}

// Available models (January 2026)
export const AVAILABLE_MODELS: AIModelWithTier[] = [
  // ============================================
  // GOOGLE GEMINI 3 MODELS
  // ============================================
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    apiModelId: 'google/gemini-3-flash-preview',
    tier: 'fast',
    tierLabel: '🚀 Snabb',
    speedRating: 5,
    qualityRating: 4,
    description: 'Optimerad för snabb dokumentbehandling. Bästa pris/prestanda för OCR.',
    strengths: [
      'Snabbast för dokumentbehandling',
      'Lägsta kostnad (5,25 kr/M input)',
      'Utmärkt för Excel & tabeller',
      'Hög genomströmning'
    ],
    weaknesses: [
      'Något lägre på komplexa layouter',
      'Inte lika bra på handskrift'
    ],
    pricing: { 
      inputUSD: 0.50, 
      outputUSD: 3, 
      inputSEK: 5.25, 
      outputSEK: 31.50 
    },
    estimatedCostPerDoc: calcDocCost(0.50, 3),
    contextWindow: 1000000,
    recommended: true,
    supportsVision: true,
    ocrAccuracy: { digital: 94, scanned: 82, handwritten: 72 }
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    apiModelId: 'google/gemini-3-pro-preview',
    tier: 'premium',
    tierLabel: '👑 Premium',
    speedRating: 3,
    qualityRating: 5,
    description: 'Multimodal resonemang med stark bildbehandling. Bäst för komplexa dokument.',
    strengths: [
      'Högsta kvalitet för OCR',
      'Utmärkt multimodal förståelse',
      'Bäst för komplexa tabeller',
      'Stark bildbehandling'
    ],
    weaknesses: [
      'Dyrare än Flash (21 kr/M input)',
      'Långsammare bearbetning'
    ],
    pricing: { 
      inputUSD: 2, 
      outputUSD: 12, 
      inputSEK: 21, 
      outputSEK: 126 
    },
    estimatedCostPerDoc: calcDocCost(2, 12),
    contextWindow: 1000000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 97, scanned: 88, handwritten: 78 }
  },

  // ============================================
  // OPENAI GPT-5.2 MODELS
  // ============================================
  {
    id: 'gpt-5.2-chat',
    name: 'GPT-5.2 Chat',
    provider: 'openai',
    apiModelId: 'openai/gpt-5.2-chat',
    tier: 'fast',
    tierLabel: '🚀 Snabb',
    speedRating: 5,
    qualityRating: 4,
    description: 'Snabb och prisvärd. Bra för enklare dokument och verifiering.',
    strengths: [
      'Snabba svar',
      'Bra pris (18,40 kr/M input)',
      'Bra för validering',
      'Stabil JSON-output'
    ],
    weaknesses: [
      'Lägre noggrannhet än GPT-5.2',
      'Inte för komplexa layouter'
    ],
    pricing: { 
      inputUSD: 1.75, 
      outputUSD: 14, 
      inputSEK: 18.375, 
      outputSEK: 147 
    },
    estimatedCostPerDoc: calcDocCost(1.75, 14),
    contextWindow: 128000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 82, scanned: 75, handwritten: 88 }
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    apiModelId: 'openai/gpt-5.2',
    tier: 'premium',
    tierLabel: '👑 Premium',
    speedRating: 2,
    qualityRating: 5,
    description: 'Adaptiv resonemang för komplex dokumentanalys. Bäst för svåra fall.',
    strengths: [
      'Bästa resonemang för OpenAI',
      'Utmärkt på komplexa layouter',
      'Adaptiv dokumentanalys',
      'Stark handskriftsigenkänning'
    ],
    weaknesses: [
      'Långsammare bearbetning',
      'Högre kostnad'
    ],
    pricing: { 
      inputUSD: 1.75, 
      outputUSD: 14, 
      inputSEK: 18.375, 
      outputSEK: 147 
    },
    estimatedCostPerDoc: calcDocCost(1.75, 14),
    contextWindow: 128000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 88, scanned: 82, handwritten: 94 }
  },

  // ============================================
  // ANTHROPIC CLAUDE 4.5 MODELS
  // ============================================
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    apiModelId: 'anthropic/claude-haiku-4.5',
    tier: 'fast',
    tierLabel: '🚀 Snabb',
    speedRating: 5,
    qualityRating: 3,
    description: 'Snabbast för lättvikts OCR-uppgifter. Perfekt för validering och enkla dokument.',
    strengths: [
      'Snabbaste Claude-modellen',
      'Låg kostnad (10,50 kr/M input)',
      'Utmärkt för validering',
      'Bra för enkla fakturor'
    ],
    weaknesses: [
      'Lägre noggrannhet överlag',
      'Inte för primär extraktion',
      'Kan missa komplexa mönster'
    ],
    pricing: { 
      inputUSD: 1, 
      outputUSD: 5, 
      inputSEK: 10.50, 
      outputSEK: 52.50 
    },
    estimatedCostPerDoc: calcDocCost(1, 5),
    contextWindow: 200000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 78, scanned: 62, handwritten: 72 }
  },
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    apiModelId: 'anthropic/claude-sonnet-4.5',
    tier: 'balanced',
    tierLabel: '⚡ Balanserad',
    speedRating: 3,
    qualityRating: 4,
    description: 'Balanserad prestanda för produktionsanvändning. Bra allround-modell.',
    strengths: [
      'Balanserad prestanda',
      'Pålitlig JSON-formatering',
      'Bra strukturerad output',
      'Produktionsklar'
    ],
    weaknesses: [
      'Dyrare än Haiku',
      'Mindre kontext (200k)',
      'Kan översammanfatta'
    ],
    pricing: { 
      inputUSD: 3, 
      outputUSD: 15, 
      inputSEK: 31.50, 
      outputSEK: 157.50 
    },
    estimatedCostPerDoc: calcDocCost(3, 15),
    contextWindow: 200000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 86, scanned: 72, handwritten: 84 }
  },
  {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    apiModelId: 'anthropic/claude-opus-4.5',
    tier: 'premium',
    tierLabel: '👑 Premium',
    speedRating: 1,
    qualityRating: 5,
    description: 'Starkaste multimodala kapaciteten. Bäst för komplexa edge cases.',
    strengths: [
      'Högsta resonemangskapacitet',
      'Bästa instruktionsföljning',
      'Utmärkt på tvetydiga data',
      'Överlägsen strukturerad output'
    ],
    weaknesses: [
      'Mycket dyr (52,50 kr/M input)',
      'Långsammast modellen',
      'Överkill för enkla dokument'
    ],
    pricing: { 
      inputUSD: 5, 
      outputUSD: 25, 
      inputSEK: 52.50, 
      outputSEK: 262.50 
    },
    estimatedCostPerDoc: calcDocCost(5, 25),
    contextWindow: 200000,
    recommended: false,
    supportsVision: true,
    ocrAccuracy: { digital: 92, scanned: 78, handwritten: 90 }
  }
];

// Helper functions
export function getModelById(modelId: string): AIModelWithTier | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export function getModelsByProvider(provider: AIProvider): AIModelWithTier[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
}

export function getModelsByTier(tier: ModelTier): AIModelWithTier[] {
  return AVAILABLE_MODELS.filter(m => m.tier === tier);
}

export function getRecommendedModel(): AIModelWithTier {
  return AVAILABLE_MODELS.find(m => m.recommended) || AVAILABLE_MODELS[0];
}

export function getFastestModel(provider?: AIProvider): AIModelWithTier {
  const models = provider ? getModelsByProvider(provider) : AVAILABLE_MODELS;
  return models.reduce((fastest, model) => 
    model.speedRating > fastest.speedRating ? model : fastest
  );
}

export function getBestQualityModel(provider?: AIProvider): AIModelWithTier {
  const models = provider ? getModelsByProvider(provider) : AVAILABLE_MODELS;
  return models.reduce((best, model) => 
    model.qualityRating > best.qualityRating ? model : best
  );
}

export function getProviderByModelId(modelId: string): AIProvider | undefined {
  const model = getModelById(modelId);
  return model?.provider;
}

/**
 * Get tier badge styling
 */
export function getTierBadgeClass(tier: ModelTier): string {
  switch (tier) {
    case 'fast':
      return 'bg-green-100 text-green-800';
    case 'balanced':
      return 'bg-blue-100 text-blue-800';
    case 'premium':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get speed rating as visual indicator
 */
export function getSpeedIndicator(rating: number): string {
  return '⚡'.repeat(rating) + '○'.repeat(5 - rating);
}

/**
 * Get quality rating as visual indicator
 */
export function getQualityIndicator(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * Calculate estimated cost for a document
 * @param inputTokens - Estimated input tokens
 * @param outputTokens - Estimated output tokens
 * @param modelId - The model ID
 * @returns Cost object with USD and SEK
 */
export function estimateCost(
  inputTokens: number, 
  outputTokens: number, 
  modelId: string
): { USD: number; SEK: number } {
  const model = getModelById(modelId);
  if (!model) return { USD: 0, SEK: 0 };
  
  const inputCostUSD = (inputTokens / 1_000_000) * model.pricing.inputUSD;
  const outputCostUSD = (outputTokens / 1_000_000) * model.pricing.outputUSD;
  const totalUSD = inputCostUSD + outputCostUSD;
  
  return {
    USD: Math.round(totalUSD * 10000) / 10000,
    SEK: Math.round(totalUSD * USD_TO_SEK * 1000) / 1000
  };
}

/**
 * Format cost for display in SEK
 */
export function formatCostSEK(cost: number): string {
  if (cost < 0.01) {
    return `${(cost * 100).toFixed(2)} öre`;
  }
  if (cost < 1) {
    return `${cost.toFixed(2)} kr`;
  }
  return `${cost.toFixed(2)} kr`;
}

/**
 * Format cost for display in USD
 */
export function formatCostUSD(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format cost for display (default to SEK)
 */
export function formatCost(cost: number, currency: 'SEK' | 'USD' = 'SEK'): string {
  return currency === 'SEK' ? formatCostSEK(cost) : formatCostUSD(cost);
}

/**
 * Get pricing display string for a model
 */
export function getPricingDisplay(model: AIModelWithTier): string {
  return `${model.pricing.inputSEK.toFixed(2)} kr / ${model.pricing.outputSEK.toFixed(2)} kr per 1M tokens`;
}

/**
 * Get estimated cost per document display
 */
export function getDocCostDisplay(model: AIModelWithTier): string {
  const cost = model.estimatedCostPerDoc;
  if (cost.SEK < 0.10) {
    return `~${(cost.SEK * 100).toFixed(1)} öre/dok`;
  }
  return `~${cost.SEK.toFixed(2)} kr/dok`;
}

/**
 * Get accuracy color class based on percentage
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-600';
  if (accuracy >= 75) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get accuracy badge color
 */
export function getAccuracyBadgeClass(accuracy: number): string {
  if (accuracy >= 90) return 'bg-green-100 text-green-800';
  if (accuracy >= 75) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
