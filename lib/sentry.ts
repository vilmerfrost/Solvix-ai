/**
 * Sentry Integration
 * Error tracking and performance monitoring
 */

// NOTE: Install sentry packages:
// npm install @sentry/nextjs

interface SentryClient {
  captureException: (error: Error, context?: object) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
  setTag: (key: string, value: string) => void;
  startTransaction: (context: object) => any;
}

let sentryClient: SentryClient | null = null;
let sentryInitialized = false;

/**
 * Initialize Sentry (call once at app startup)
 */
export function initSentry(): void {
  if (sentryInitialized) return;
  
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log("Sentry DSN not configured - error tracking disabled");
    sentryInitialized = true;
    return;
  }

  try {
    const Sentry = require("@sentry/nextjs");
    
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      
      // Only send errors in production
      beforeSend(event: any) {
        if (process.env.NODE_ENV === "development") {
          console.log("[Sentry] Would send:", event);
          return null;
        }
        return event;
      },
    });
    
    sentryClient = Sentry;
    sentryInitialized = true;
    console.log("Sentry initialized");
  } catch (err) {
    console.warn("Sentry initialization failed:", err);
    sentryInitialized = true;
  }
}

/**
 * Get Sentry client (initializes if needed)
 */
function getSentry(): SentryClient | null {
  if (!sentryInitialized) {
    initSentry();
  }
  return sentryClient;
}

/**
 * Capture an exception
 */
export function captureException(
  error: Error,
  context?: {
    userId?: string;
    documentId?: string;
    route?: string;
    action?: string;
    extra?: Record<string, any>;
  }
): void {
  const sentry = getSentry();
  
  // Always log to console
  console.error("[Error]", error.message, context);
  
  if (sentry) {
    sentry.captureException(error, {
      extra: {
        ...context?.extra,
        documentId: context?.documentId,
        route: context?.route,
        action: context?.action,
      },
      user: context?.userId ? { id: context.userId } : undefined,
    } as any);
  }
}

/**
 * Capture a message (non-error)
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  const sentry = getSentry();
  
  console.log(`[${level.toUpperCase()}]`, message);
  
  if (sentry) {
    sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for all future events
 */
export function setUser(user: { id: string; email?: string } | null): void {
  const sentry = getSentry();
  if (sentry) {
    sentry.setUser(user);
  }
}

/**
 * Add a tag to all future events
 */
export function setTag(key: string, value: string): void {
  const sentry = getSentry();
  if (sentry) {
    sentry.setTag(key, value);
  }
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: {
    action: string;
    userId?: string;
    documentId?: string;
  }
): Promise<T> {
  return fn().catch((error) => {
    captureException(error, context);
    throw error;
  });
}

/**
 * Express-style error handler for API routes
 */
export function handleApiError(
  error: Error,
  context?: {
    route: string;
    userId?: string;
    documentId?: string;
  }
): { error: string; errorId?: string } {
  captureException(error, context);
  
  return {
    error: process.env.NODE_ENV === "production" 
      ? "An error occurred" 
      : error.message,
  };
}
