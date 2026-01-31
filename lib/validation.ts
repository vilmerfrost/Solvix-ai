/**
 * Input Validation Utilities
 * 
 * Security-focused validation functions to prevent XSS, injection attacks,
 * and ensure data integrity across the application.
 */

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Safely extract error message from unknown error type
 * Use this in catch blocks after TypeScript 4.4+ strict mode
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return (error instanceof Error ? error.message : String(error));
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Type guard to check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ============================================================================
// STRING VALIDATION
// ============================================================================

/**
 * Maximum lengths for common field types
 */
export const MAX_LENGTHS = {
  filename: 255,
  email: 320,
  url: 2048,
  text: 10000,
  name: 100,
  uuid: 36,
  apiKey: 100,
} as const;

/**
 * UUID v4 regex pattern
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern (RFC 5322 simplified)
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL pattern for HTTP/HTTPS
 */
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = MAX_LENGTHS.text): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters except newlines/tabs
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);
  
  return sanitized;
}

/**
 * Sanitize a filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'unnamed';
  }
  
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[/\\]/g, '_')        // Replace path separators
    .replace(/\.\./g, '_')          // Prevent directory traversal
    .replace(/[<>:"|?*]/g, '_')     // Remove Windows forbidden chars
    .replace(/[\x00-\x1F]/g, '')    // Remove control characters
    .trim();
  
  // Limit length
  sanitized = sanitized.substring(0, MAX_LENGTHS.filename);
  
  // Ensure not empty
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'unnamed';
  }
  
  return sanitized;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return input.replace(/[&<>"'`=/]/g, char => htmlEscapes[char] || char);
}

// ============================================================================
// TYPE VALIDATION
// ============================================================================

/**
 * Validate UUID format
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_LENGTHS.email &&
    EMAIL_PATTERN.test(value)
  );
}

/**
 * Validate URL format
 */
export function isValidURL(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_LENGTHS.url) {
    return false;
  }
  
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

/**
 * Validate non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate document ID from request
 */
export function validateDocumentId(id: unknown): ValidationResult<string> {
  if (!isValidUUID(id)) {
    return { success: false, errors: ['Invalid document ID format'] };
  }
  return { success: true, data: id };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: unknown,
  limit: unknown
): ValidationResult<{ page: number; limit: number }> {
  const errors: string[] = [];
  
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  
  const validPage = typeof pageNum === 'number' && Number.isInteger(pageNum) && pageNum >= 1
    ? pageNum
    : 1;
  
  const validLimit = typeof limitNum === 'number' && Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= 100
    ? limitNum
    : 20;
  
  return {
    success: errors.length === 0,
    data: { page: validPage, limit: validLimit },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: { name: string; size: number; type?: string },
  allowedTypes: string[] = [],
  maxSizeBytes: number = 50 * 1024 * 1024 // 50MB default
): ValidationResult<{ name: string; size: number }> {
  const errors: string[] = [];
  
  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name);
  
  // Check size
  if (!isPositiveInteger(file.size) || file.size > maxSizeBytes) {
    errors.push(`File size must be between 1 byte and ${maxSizeBytes / (1024 * 1024)}MB`);
  }
  
  // Check type if allowed types specified
  if (allowedTypes.length > 0 && file.type) {
    const isAllowed = allowedTypes.some(
      allowed => file.type === allowed || file.name.toLowerCase().endsWith(allowed.replace('*/', '.'))
    );
    if (!isAllowed) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }
  
  // Check extension
  const extension = sanitizedName.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg'];
  if (!extension || !allowedExtensions.includes(extension)) {
    errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }
  
  return {
    success: errors.length === 0,
    data: { name: sanitizedName, size: file.size },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: unknown): ValidationResult<string> {
  if (!isValidURL(url)) {
    return { success: false, errors: ['Invalid webhook URL'] };
  }
  
  // Must be HTTPS for security (except localhost for development)
  const parsed = new URL(url as string);
  if (parsed.protocol !== 'https:' && !parsed.hostname.includes('localhost')) {
    return { success: false, errors: ['Webhook URL must use HTTPS'] };
  }
  
  return { success: true, data: url as string };
}

/**
 * Validate API key format for different providers
 */
export function validateApiKeyFormat(
  apiKey: unknown,
  provider: 'google' | 'openai' | 'anthropic'
): ValidationResult<string> {
  if (typeof apiKey !== 'string' || apiKey.length === 0 || apiKey.length > MAX_LENGTHS.apiKey) {
    return { success: false, errors: ['Invalid API key format'] };
  }
  
  // Basic format validation per provider
  switch (provider) {
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        return { success: false, errors: ['Anthropic API keys should start with "sk-ant-"'] };
      }
      break;
    case 'openai':
      if (!apiKey.startsWith('sk-') || apiKey.startsWith('sk-ant-')) {
        return { success: false, errors: ['OpenAI API keys should start with "sk-"'] };
      }
      break;
    case 'google':
      if (apiKey.length < 30) {
        return { success: false, errors: ['Google API key appears too short'] };
      }
      break;
  }
  
  return { success: true, data: apiKey };
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * In-memory rate limit store (for production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting check
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [k, v] of rateLimitStore) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}
