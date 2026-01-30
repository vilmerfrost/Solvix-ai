"use client";

import { useState, useEffect } from "react";
import { Check, Lock, Star, Zap, Brain, DollarSign, AlertCircle, Gauge, Sparkles } from "lucide-react";
import { 
  AVAILABLE_MODELS, 
  AIModelWithTier, 
  PROVIDERS, 
  formatCost, 
  getAccuracyBadgeClass,
  getTierBadgeClass,
  getDocCostDisplay,
  getPricingDisplay,
  ModelTier
} from "@/config/models";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  configuredProviders?: string[];
  showPricing?: boolean;
  compact?: boolean;
  showTierFilter?: boolean;
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  configuredProviders = [],
  showPricing = true,
  compact = false,
  showTierFilter = true,
}: ModelSelectorProps) {
  const [models, setModels] = useState<(AIModelWithTier & { available: boolean })[]>([]);
  const [tierFilter, setTierFilter] = useState<ModelTier | 'all'>('all');

  useEffect(() => {
    // Mark models as available based on configured providers
    const modelsWithAvailability = AVAILABLE_MODELS.map(model => ({
      ...model,
      available: configuredProviders.includes(model.provider)
    }));
    setModels(modelsWithAvailability);
  }, [configuredProviders]);

  // Filter models by tier
  const filteredModels = tierFilter === 'all' 
    ? models 
    : models.filter(m => m.tier === tierFilter);

  if (compact) {
    return (
      <CompactSelector
        models={filteredModels}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        showPricing={showPricing}
        tierFilter={tierFilter}
        setTierFilter={setTierFilter}
        showTierFilter={showTierFilter}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Tier Filter */}
      {showTierFilter && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600 mr-2">Filter:</span>
          <TierFilterButton tier="all" current={tierFilter} onClick={() => setTierFilter('all')} label="Alla" />
          <TierFilterButton tier="fast" current={tierFilter} onClick={() => setTierFilter('fast')} label="🚀 Snabb" />
          <TierFilterButton tier="balanced" current={tierFilter} onClick={() => setTierFilter('balanced')} label="⚡ Balanserad" />
          <TierFilterButton tier="premium" current={tierFilter} onClick={() => setTierFilter('premium')} label="👑 Premium" />
        </div>
      )}

      {/* Group by provider */}
      {(['google', 'openai', 'anthropic'] as const).map(provider => {
        const providerModels = filteredModels.filter(m => m.provider === provider);
        const providerInfo = PROVIDERS[provider];
        const isConfigured = configuredProviders.includes(provider);

        if (providerModels.length === 0) return null;

        return (
          <div key={provider} className="space-y-3">
            {/* Provider Header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{providerInfo.logo}</span>
              <span className="font-medium text-gray-900">{providerInfo.name}</span>
              {!isConfigured && (
                <span className="text-xs text-orange-600 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  API key required
                </span>
              )}
            </div>

            {/* Model Cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {providerModels.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  isAvailable={model.available}
                  onSelect={() => model.available && onSelectModel(model.id)}
                  showPricing={showPricing}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TierFilterButton({ 
  tier, 
  current, 
  onClick, 
  label 
}: { 
  tier: ModelTier | 'all'; 
  current: ModelTier | 'all'; 
  onClick: () => void; 
  label: string;
}) {
  const isActive = tier === current;
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

interface ModelCardProps {
  model: AIModelWithTier & { available: boolean };
  isSelected: boolean;
  isAvailable: boolean;
  onSelect: () => void;
  showPricing: boolean;
}

function ModelCard({ model, isSelected, isAvailable, onSelect, showPricing }: ModelCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!isAvailable}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : isAvailable 
            ? 'border-gray-200 hover:border-gray-300 bg-white' 
            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Locked Icon */}
      {!isAvailable && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
          <Lock className="w-3 h-3 text-gray-600" />
        </div>
      )}

      {/* Model Name & Badges */}
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <h4 className="font-semibold text-gray-900">{model.name}</h4>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeClass(model.tier)}`}>
          {model.tierLabel}
        </span>
        {model.recommended && (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Recommended
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {model.description}
      </p>

      {/* Speed & Quality Ratings */}
      <div className="flex gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <Gauge className="w-3 h-3 text-green-600" />
          <span className="text-gray-600">Hastighet:</span>
          <span className="text-green-600">{'●'.repeat(model.speedRating)}{'○'.repeat(5-model.speedRating)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span className="text-gray-600">Kvalitet:</span>
          <span className="text-purple-600">{'●'.repeat(model.qualityRating)}{'○'.repeat(5-model.qualityRating)}</span>
        </div>
      </div>

      {/* Accuracy Stats */}
      <div className="flex flex-wrap gap-1 mb-3">
        <AccuracyBadge label="Digital" value={model.ocrAccuracy.digital} />
        <AccuracyBadge label="Scanned" value={model.ocrAccuracy.scanned} />
        <AccuracyBadge label="Handskrift" value={model.ocrAccuracy.handwritten} />
      </div>

      {/* Pricing */}
      {showPricing && (
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>{model.pricing.inputSEK.toFixed(2)} kr / {model.pricing.outputSEK.toFixed(2)} kr per 1M tokens</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
              {getDocCostDisplay(model)}
            </span>
          </div>
        </div>
      )}

      {/* Key Strength */}
      <div className="pt-2 border-t border-gray-100">
        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
          {model.strengths[0]}
        </span>
      </div>
    </button>
  );
}

function AccuracyBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className={`text-xs px-2 py-1 rounded ${getAccuracyBadgeClass(value)}`}>
      {label}: {value}%
    </div>
  );
}

// Compact dropdown selector
function CompactSelector({
  models,
  selectedModel,
  onSelectModel,
  showPricing,
  tierFilter,
  setTierFilter,
  showTierFilter,
}: {
  models: (AIModelWithTier & { available: boolean })[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  showPricing: boolean;
  tierFilter?: ModelTier | 'all';
  setTierFilter?: (tier: ModelTier | 'all') => void;
  showTierFilter?: boolean;
}) {
  const selected = models.find(m => m.id === selectedModel) || AVAILABLE_MODELS.find(m => m.id === selectedModel);

  // Group models by tier for the dropdown
  const tierLabels: Record<ModelTier, string> = {
    fast: '🚀 Snabb',
    balanced: '⚡ Balanserad', 
    premium: '👑 Premium'
  };

  return (
    <div className="space-y-2">
      {/* Tier Quick Select */}
      {showTierFilter && setTierFilter && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setTierFilter('all')}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
              tierFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alla
          </button>
          <button
            onClick={() => setTierFilter('fast')}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
              tierFilter === 'fast' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🚀 Snabb
          </button>
          <button
            onClick={() => setTierFilter('balanced')}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
              tierFilter === 'balanced' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚡ Balans
          </button>
          <button
            onClick={() => setTierFilter('premium')}
            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
              tierFilter === 'premium' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👑 Premium
          </button>
        </div>
      )}

      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {(['google', 'openai', 'anthropic'] as const).map(provider => {
            const providerModels = models.filter(m => m.provider === provider);
            if (providerModels.length === 0) return null;
            
            return (
              <optgroup key={provider} label={PROVIDERS[provider].name}>
                {providerModels.map(model => (
                  <option 
                    key={model.id} 
                    value={model.id}
                    disabled={!model.available}
                  >
                    {tierLabels[model.tier]} {model.name} 
                    {model.recommended ? ' ⭐' : ''} 
                    {!model.available ? ' (API-nyckel krävs)' : ''}
                    {showPricing ? ` - ${getDocCostDisplay(model)}` : ''}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {/* Custom arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Selected model info */}
      {selected && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">{selected.name}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeClass(selected.tier)}`}>
              {selected.tierLabel}
            </span>
            {selected.recommended && (
              <span className="text-xs text-yellow-600">⭐ Rekommenderad</span>
            )}
          </div>
          
          {/* Speed & Quality */}
          <div className="flex gap-4 mb-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Hastighet:</span>
              <span className="text-green-600">{'●'.repeat(selected.speedRating)}{'○'.repeat(5-selected.speedRating)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Kvalitet:</span>
              <span className="text-purple-600">{'●'.repeat(selected.qualityRating)}{'○'.repeat(5-selected.qualityRating)}</span>
            </div>
          </div>

          {/* Cost info */}
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
              {getDocCostDisplay(selected)}
            </span>
            <span className="text-gray-400">
              ({selected.pricing.inputSEK.toFixed(2)} / {selected.pricing.outputSEK.toFixed(2)} kr per 1M tokens)
            </span>
          </div>

          {/* Accuracy badges */}
          <div className="flex flex-wrap gap-1">
            <AccuracyBadge label="Digital" value={selected.ocrAccuracy.digital} />
            <AccuracyBadge label="Scanned" value={selected.ocrAccuracy.scanned} />
            <AccuracyBadge label="Handskrift" value={selected.ocrAccuracy.handwritten} />
          </div>
        </div>
      )}
    </div>
  );
}

// Export a hook for fetching configured providers
export function useConfiguredProviders() {
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch("/api/user/api-keys");
        const data = await response.json();
        if (data.success) {
          const configured = data.providers
            .filter((p: any) => p.hasKey && p.isValid)
            .map((p: any) => p.provider);
          setProviders(configured);
        }
      } catch (err) {
        console.error("Failed to fetch providers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  return { providers, loading };
}
