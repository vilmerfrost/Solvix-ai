/**
 * Core Types for Vextra AI Document Pipeline
 * 
 * This module provides strict TypeScript interfaces for all document
 * processing, extraction, and database operations.
 */

// Re-export extraction types
export * from './extraction/types';

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentStatus = 
  | 'uploaded' 
  | 'queued' 
  | 'processing' 
  | 'needs_review' 
  | 'approved' 
  | 'verified'
  | 'exported' 
  | 'error' 
  | 'rejected';

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string | null;
  url: string | null;
  status: DocumentStatus;
  extracted_data: ExtractedDocumentData | null;
  archived: boolean;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedDocumentData {
  lineItems: LineItem[];
  metadata: ExtractionMetadata;
  totalWeightKg: number;
  totalCostSEK?: number;
  documentType: string;
  uniqueAddresses: number;
  uniqueReceivers: number;
  uniqueMaterials: number;
  documentMetadata?: DocumentMetadata;
  aiSummary?: string;
  _validation: ValidationResult;
  _processingLog?: string[];
  _verification?: VerificationData;
  _error?: string;
  _errorTimestamp?: string;
}

export interface LineItem {
  date: string;
  location: string;
  material: string;
  weightKg: number;
  unit: string;
  receiver: string;
  isHazardous?: boolean;
  confidence?: number;
  costSEK?: number;
  co2Saved?: number;
  wasteCode?: string;
  notes?: string;
}

export interface ExtractionMetadata {
  totalRows?: number;
  extractedRows?: number;
  aggregatedRows?: number;
  processedRows?: number;
  model?: string;
  provider?: string;
  tokensUsed?: TokenUsage;
  cost?: number;
  processingTimeMs?: number;
  confidence?: number;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export interface DocumentMetadata {
  date?: string;
  address?: string;
  supplier?: string;
  receiver?: string;
}

export interface ValidationResult {
  completeness: number;
  confidence?: number;
  issues: string[];
}

export interface VerificationData {
  verified: boolean;
  verificationTime: number;
  hallucinations: HallucinationIssue[];
}

export interface HallucinationIssue {
  rowIndex: number;
  field: string;
  extracted: unknown;
  issue: string;
  severity: 'warning' | 'error';
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export type DefaultPdfModel = 'mistral-ocr' | 'claude-vision' | 'gemini-vision';
export type DefaultExcelModel = 'gemini-flash' | 'claude-haiku' | 'openai-gpt';

export interface UserSettings {
  user_id: string;
  auto_approve_threshold: number;
  material_synonyms: MaterialSynonyms;
  preferred_model?: string;
  custom_instructions?: string;
  known_receivers?: string[];
  default_pdf_model?: DefaultPdfModel;
  default_excel_model?: DefaultExcelModel;
  enable_verification?: boolean;
  enable_reconciliation?: boolean;
  reconciliation_threshold?: number;
}

export type MaterialSynonyms = Record<string, string[]>;

// ============================================================================
// EXCEL/SPREADSHEET TYPES
// ============================================================================

export type CellValue = string | number | boolean | null | undefined;
export type SpreadsheetRow = CellValue[];
export type SpreadsheetData = SpreadsheetRow[];

export interface ColumnStructure {
  dateColumn?: string;
  locationColumn?: string;
  materialColumn?: string;
  weightColumn?: string;
  unitColumn?: string;
  receiverColumn?: string;
  hazardousColumn?: string;
}

export interface StructureAnalysis extends ColumnStructure {
  confidence: number;
  detectedLanguage?: string;
  dateFormat?: string;
  headerRow?: number;
  dataStartRow?: number;
  translations?: ColumnTranslation[];
}

export interface ColumnTranslation {
  originalColumn: string;
  mappedTo: string;
  detectedLanguage: string;
  swedishEquivalent: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProcessResult {
  success: boolean;
  documentId: string;
  filename: string;
  status: DocumentStatus;
  error?: string;
  extractedData?: ExtractedDocumentData;
}

export interface BatchProcessResult {
  total: number;
  succeeded: number;
  failed: number;
  results: ProcessResult[];
}

// ============================================================================
// AI MODEL TYPES
// ============================================================================

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'mistral' | 'openrouter';

// Extended extraction result with confidence and source text
export interface MultiModelExtractionResult {
  success: boolean;
  items: LineItem[];
  confidence: number;
  sourceText?: string;
  model: string;
  provider: AIProvider;
  tokensUsed: TokenUsage;
  cost: number;
  processingTimeMs: number;
  error?: string;
}

// Quality assessment result from document router
export interface QualityAssessment {
  documentType: 'pdf' | 'excel' | 'image' | 'unknown';
  complexity: 'simple' | 'moderate' | 'complex';
  recommendedRoute: 'mistral-ocr' | 'gemini-flash';
  confidence: number;
  reasoning: string;
  detectedLanguage?: string;
  estimatedRows?: number;
  hasTabularData: boolean;
  hasScannedContent: boolean;
}

// Verification result from Haiku
export interface VerificationResult {
  verified: boolean;
  confidence: number;
  issues: VerificationIssue[];
  itemsVerified: number;
  itemsFlagged: number;
  processingTimeMs: number;
}

export interface VerificationIssue {
  itemIndex: number;
  field: string;
  extractedValue: unknown;
  issue: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

// Reconciliation result from Sonnet
export interface ReconciliationResult {
  success: boolean;
  items: LineItem[];
  originalConfidence: number;
  newConfidence: number;
  itemsReconciled: number;
  processingTimeMs: number;
}

// Processing result from document processor
export interface DocumentProcessingResult {
  success: boolean;
  items: LineItem[];
  confidence: number;
  verification?: VerificationResult;
  modelPath: string;
  log: string[];
  runId: string;
  totalTokens: number;
  estimatedCostUSD: number;
}

// API Key provider type (synonym for AIProvider, kept for clarity)
export type ApiKeyProvider = AIProvider;

export interface ApiKeyRow {
  id: string;
  user_id: string;
  provider: ApiKeyProvider;
  encrypted_api_key?: string | null;
  iv?: string | null;
  auth_tag?: string | null;
  key_version?: number | null;
  key_label?: string | null;
  last_validated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  apiModelId: string;
  tier: 'fast' | 'balanced' | 'premium';
  pricing: ModelPricing;
  speedRating: number;
  qualityRating: number;
  ocrAccuracy: OCRAccuracy;
  strengths: string[];
  recommended?: boolean;
}

export interface ModelPricing {
  inputSEK: number;
  outputSEK: number;
}

export interface OCRAccuracy {
  digital: number;
  scanned: number;
  handwritten: number;
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface SettingsRow {
  id: string;
  user_id: string;
  default_pdf_model: DefaultPdfModel;
  default_excel_model: DefaultExcelModel;
  enable_verification: boolean;
  enable_reconciliation: boolean;
  reconciliation_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractionRunRow {
  id: string;
  document_id: string;
  user_id: string;
  model_path?: string | null;
  quality_assessment?: Record<string, unknown> | null;
  extraction_result?: Record<string, unknown> | null;
  reconciliation_result?: Record<string, unknown> | null;
  verification_result?: Record<string, unknown> | null;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: string | null;
  created_at: string;
}

export type ModelUsageProvider = ApiKeyProvider;

export interface ModelUsageRow {
  id: string;
  user_id: string;
  extraction_run_id?: string | null;
  provider: ModelUsageProvider;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: string | null;
  created_at: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export type WebhookEvent = 
  | 'document.uploaded'
  | 'document.processed'
  | 'document.approved'
  | 'document.rejected'
  | 'document.exported'
  | 'document.error'
  | 'batch.completed';

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  is_active: boolean;
  total_sent: number;
  total_success: number;
  total_failed: number;
  last_triggered_at?: string;
  last_status?: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  duration?: number;
}

// ============================================================================
// LOGGER TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

export interface LogContext {
  userId?: string;
  documentId?: string;
  route?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

// ============================================================================
// BILLING TYPES
// ============================================================================

export interface UsageRecord {
  id: string;
  user_id: string;
  model_id: string;
  provider: AIProvider;
  document_id?: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_sek: number;
  processing_time_ms?: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface MonthlyUsageSummary {
  user_id: string;
  month: string;
  total_extractions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_sek: number;
  successful_extractions: number;
  failed_extractions: number;
  avg_processing_time_ms: number;
}

// ============================================================================
// AZURE TYPES
// ============================================================================

export interface AzureConnection {
  id: string;
  user_id: string;
  connection_name: string;
  encrypted_connection_string: string;
  container_name: string;
  input_folder?: string;
  output_folder?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AzureBlobItem {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  contentType?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorType = 
  | 'api_key'
  | 'rate_limit'
  | 'server_error'
  | 'timeout'
  | 'invalid_response'
  | 'validation'
  | 'unknown';

export interface ErrorDetail {
  provider: string;
  model: string;
  error: string;
  errorType: ErrorType;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes all properties of T optional and allows null
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] | null;
};

/**
 * Extract the value type from a wrapped field
 */
export interface WrappedValue<T = unknown> {
  value: T;
  confidence?: number;
}

/**
 * Type guard for wrapped values
 */
export function isWrappedValue<T>(value: unknown): value is WrappedValue<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value
  );
}

/**
 * Safely extract value from potentially wrapped field
 */
export function getValue<T>(field: T | WrappedValue<T> | null | undefined): T | null {
  if (field === null || field === undefined) return null;
  if (isWrappedValue<T>(field)) return field.value;
  return field;
}

/**
 * Type for Anthropic API message content blocks
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
