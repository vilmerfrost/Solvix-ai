/**
 * Industry Configuration
 * Defines available industries and their default feature sets
 */

export interface IndustryConfig {
  id: string;
  name: string;
  nameSv: string;
  icon: string;
  description: string;
  descriptionSv: string;
  defaultFeatures: Record<string, boolean>;
  defaultModel: string;
  hideFields: string[];
  sampleDocumentTypes: string[];
}

export const INDUSTRIES: IndustryConfig[] = [
  {
    id: 'office',
    name: 'Office / IT',
    nameSv: 'Kontor / IT',
    icon: '🏢',
    description: 'General office document processing — invoices, reports, forms',
    descriptionSv: 'Allmän dokumenthantering — fakturor, rapporter, formulär',
    defaultFeatures: {
      azure_integration: false,
      material_synonyms: false,
      waste_codes: false,
      simplitics_export: false,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: ['wasteCode', 'isHazardous', 'co2Saved', 'receiver'],
    sampleDocumentTypes: ['Fakturor', 'Rapporter', 'Formulär', 'Leveranssedlar'],
  },
  {
    id: 'logistics',
    name: 'Logistics / Transport',
    nameSv: 'Logistik / Transport',
    icon: '🚛',
    description: 'Delivery notes, shipping manifests, transport documents',
    descriptionSv: 'Följesedlar, fraktsedlar, transportdokument',
    defaultFeatures: {
      azure_integration: false,
      material_synonyms: false,
      waste_codes: false,
      simplitics_export: false,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: ['wasteCode', 'isHazardous', 'co2Saved'],
    sampleDocumentTypes: ['Följesedlar', 'Fraktsedlar', 'CMR-dokument', 'Packsedlar'],
  },
  {
    id: 'waste',
    name: 'Waste Management',
    nameSv: 'Avfallshantering',
    icon: '🗑️',
    description: 'Waste documents, weighing slips, waste codes, Simplitics integration',
    descriptionSv: 'Avfallsdokument, vågsedlar, avfallskoder, Simplitics-integration',
    defaultFeatures: {
      azure_integration: true,
      material_synonyms: true,
      waste_codes: true,
      simplitics_export: true,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: [],
    sampleDocumentTypes: ['Vågsedlar', 'Avfallsrapporter', 'Transportdokument', 'Följesedlar'],
  },
  {
    id: 'construction',
    name: 'Construction',
    nameSv: 'Bygg & Anläggning',
    icon: '🏗️',
    description: 'Material lists, delivery notes, project documentation',
    descriptionSv: 'Materiallistor, leveranssedlar, projektdokumentation',
    defaultFeatures: {
      azure_integration: false,
      material_synonyms: true,
      waste_codes: false,
      simplitics_export: false,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: ['wasteCode', 'isHazardous', 'co2Saved'],
    sampleDocumentTypes: ['Materiallistor', 'Leveranssedlar', 'Beställningar', 'Fakturaunderlag'],
  },
  {
    id: 'finance',
    name: 'Finance / Accounting',
    nameSv: 'Ekonomi / Redovisning',
    icon: '💰',
    description: 'Invoices, receipts, financial statements',
    descriptionSv: 'Fakturor, kvitton, bokslut',
    defaultFeatures: {
      azure_integration: false,
      material_synonyms: false,
      waste_codes: false,
      simplitics_export: false,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: ['wasteCode', 'isHazardous', 'co2Saved', 'material', 'receiver'],
    sampleDocumentTypes: ['Fakturor', 'Kvitton', 'Bokslut', 'Årsredovisningar'],
  },
  {
    id: 'other',
    name: 'Other',
    nameSv: 'Annat',
    icon: '📊',
    description: 'Custom document processing for any industry',
    descriptionSv: 'Anpassad dokumenthantering för alla branscher',
    defaultFeatures: {
      azure_integration: false,
      material_synonyms: false,
      waste_codes: false,
      simplitics_export: false,
      batch_processing: true,
      excel_export: true,
      api_access: false,
    },
    defaultModel: 'gemini-3-flash',
    hideFields: ['wasteCode', 'isHazardous', 'co2Saved'],
    sampleDocumentTypes: ['PDF-dokument', 'Excel-filer', 'Skannade dokument'],
  },
];

export function getIndustryConfig(industryId: string): IndustryConfig {
  return INDUSTRIES.find(i => i.id === industryId) || INDUSTRIES.find(i => i.id === 'other')!;
}

export function getDefaultFeatures(industryId: string): Record<string, boolean> {
  return getIndustryConfig(industryId).defaultFeatures;
}

export function getHiddenFields(industryId: string): string[] {
  return getIndustryConfig(industryId).hideFields;
}
