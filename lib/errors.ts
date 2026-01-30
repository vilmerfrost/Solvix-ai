/**
 * Error Handling Utilities
 * Provides typed errors with user-friendly suggestions
 */

export type ErrorType = 
  | "api_key" 
  | "azure" 
  | "system" 
  | "validation"
  | "auth"
  | "not_found"
  | "rate_limit";

export interface ErrorSuggestion {
  sv: string;
  en: string;
  action?: string;
  actionLabel?: { sv: string; en: string };
}

const ERROR_SUGGESTIONS: Record<ErrorType, ErrorSuggestion> = {
  api_key: {
    sv: "Kontrollera din API-nyckel eller byt modell.",
    en: "Check your API key or switch models.",
    action: "/settings/api-keys",
    actionLabel: { sv: "Hantera API-nycklar", en: "Manage API keys" },
  },
  azure: {
    sv: "Kontrollera Azure-inställningar.",
    en: "Check Azure settings.",
    action: "/settings/azure",
    actionLabel: { sv: "Hantera Azure", en: "Manage Azure" },
  },
  system: {
    sv: "Systemfel uppstod. Kontakta support: vilmer.frost@gmail.com",
    en: "A system error occurred. Contact support: vilmer.frost@gmail.com",
    action: "mailto:vilmer.frost@gmail.com",
    actionLabel: { sv: "Kontakta support", en: "Contact support" },
  },
  validation: {
    sv: "Validering misslyckades. Kontrollera indata.",
    en: "Validation failed. Check your input.",
  },
  auth: {
    sv: "Du måste vara inloggad för att utföra denna åtgärd.",
    en: "You must be logged in to perform this action.",
    action: "/login",
    actionLabel: { sv: "Logga in", en: "Log in" },
  },
  not_found: {
    sv: "Resursen kunde inte hittas.",
    en: "The resource could not be found.",
  },
  rate_limit: {
    sv: "För många förfrågningar. Vänta en stund och försök igen.",
    en: "Too many requests. Please wait and try again.",
  },
};

export interface ErrorResponse {
  success: false;
  error: string;
  errorType: ErrorType;
  suggestion: ErrorSuggestion;
  errorId: string;
  timestamp: string;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  type: ErrorType,
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  const errorId = crypto.randomUUID();
  
  // Log error with ID for debugging
  console.error(`[${errorId}] ${type}: ${message}`, details || "");

  return {
    success: false,
    error: message,
    errorType: type,
    suggestion: ERROR_SUGGESTIONS[type],
    errorId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if an error is an API key error
 */
export function isApiKeyError(error: Error | any): boolean {
  const message = error?.message?.toLowerCase() || "";
  return (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("invalid key") ||
    message.includes("authentication") ||
    error?.status === 401
  );
}

/**
 * Check if an error is an Azure error
 */
export function isAzureError(error: Error | any): boolean {
  const message = error?.message?.toLowerCase() || "";
  return (
    message.includes("azure") ||
    message.includes("blob") ||
    message.includes("storage") ||
    message.includes("container")
  );
}

/**
 * Determine error type from error object
 */
export function getErrorType(error: Error | any): ErrorType {
  if (isApiKeyError(error)) return "api_key";
  if (isAzureError(error)) return "azure";
  if (error?.status === 404) return "not_found";
  if (error?.status === 429) return "rate_limit";
  if (error?.status === 401 || error?.status === 403) return "auth";
  return "system";
}

/**
 * Create an error response from a caught error
 */
export function handleError(error: Error | any): ErrorResponse {
  const type = getErrorType(error);
  const message = error?.message || "An unexpected error occurred";
  return createErrorResponse(type, message, { stack: error?.stack });
}

/**
 * Credit limit warning message
 */
export const CREDIT_LIMIT_WARNING = {
  sv: "Vi rekommenderar starkt att du sätter en kostnadsgräns hos din AI-leverantör för att undvika oväntade kostnader.",
  en: "We strongly recommend setting a cost limit with your AI provider to avoid unexpected charges.",
  links: {
    google: "https://console.cloud.google.com/billing",
    openai: "https://platform.openai.com/account/limits",
    anthropic: "https://console.anthropic.com/settings/limits",
  },
};
