/**
 * Unified Logger
 * Integrates with Better Stack (Logtail) and provides consistent logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  documentId?: string;
  route?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

interface LogtailClient {
  debug: (message: string, context?: object) => void;
  info: (message: string, context?: object) => void;
  warn: (message: string, context?: object) => void;
  error: (message: string, context?: object) => void;
  flush: () => Promise<void>;
}

// Lazy-loaded Better Stack/Logtail client
let logtailClient: LogtailClient | null = null;

function getLogtailClient(): LogtailClient | null {
  if (logtailClient !== null) return logtailClient;

  const token = process.env.BETTER_STACK_TOKEN || process.env.LOGTAIL_TOKEN;
  if (!token) {
    console.log("Better Stack token not configured - using console logging only");
    return null;
  }

  try {
    const { Logtail } = require("@logtail/node");
    logtailClient = new Logtail(token);
    return logtailClient;
  } catch {
    console.warn("@logtail/node not installed - using console logging only");
    return null;
  }
}

/**
 * Create a formatted log message
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log a message with optional context
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext
): void {
  const logtail = getLogtailClient();
  const enrichedContext = {
    ...context,
    environment: process.env.NODE_ENV,
    app: "vextra-ai",
  };

  // Console logging
  const formattedMessage = formatMessage(level, message, context);
  switch (level) {
    case "debug":
      console.debug(formattedMessage);
      break;
    case "info":
      console.info(formattedMessage);
      break;
    case "warn":
      console.warn(formattedMessage);
      break;
    case "error":
      console.error(formattedMessage);
      break;
  }

  // Better Stack logging
  if (logtail) {
    logtail[level](message, enrichedContext);
  }
}

// Convenience methods
export const debug = (message: string, context?: LogContext) => log("debug", message, context);
export const info = (message: string, context?: LogContext) => log("info", message, context);
export const warn = (message: string, context?: LogContext) => log("warn", message, context);
export const error = (message: string, context?: LogContext) => log("error", message, context);

/**
 * Flush logs (useful before serverless function terminates)
 */
export async function flushLogs(): Promise<void> {
  const logtail = getLogtailClient();
  if (logtail) {
    await logtail.flush();
  }
}

/**
 * Create a logger with pre-set context
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      log("error", message, { ...baseContext, ...context }),
  };
}

/**
 * Log API request/response
 */
export function logApiCall(
  route: string,
  method: string,
  status: number,
  duration: number,
  context?: LogContext
): void {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  log(level, `${method} ${route} ${status}`, {
    ...context,
    route,
    method,
    status,
    duration,
  });
}

/**
 * Log document processing
 */
export function logDocumentProcessing(
  documentId: string,
  action: string,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? "info" : "error";
  log(level, `Document ${action}: ${success ? "success" : "failed"}`, {
    ...context,
    documentId,
    action,
    success,
  });
}
