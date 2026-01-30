/**
 * Email Service using Resend
 * Handles developer notifications and user emails
 */

// NOTE: Install resend package: npm install resend

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  route?: string;
  action?: string;
  documentId?: string;
  sessionId?: string;
  [key: string]: any;
}

const DEVELOPER_EMAIL = "vilmer.frost@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "errors@vextra.ai";

/**
 * Initialize Resend client
 * Returns null if API key not configured
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured - emails will be logged only");
    return null;
  }
  
  // Dynamic import to avoid build errors if package not installed
  try {
    const { Resend } = require("resend");
    return new Resend(apiKey);
  } catch {
    console.warn("Resend package not installed - emails will be logged only");
    return null;
  }
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const resend = getResendClient();
  
  if (!resend) {
    // Log email instead of sending
    console.log("📧 Email (not sent - Resend not configured):", {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Notify developer of a system error
 */
export async function notifyDeveloperError(
  error: Error,
  context: ErrorContext = {}
): Promise<void> {
  const timestamp = new Date().toISOString();
  const errorId = crypto.randomUUID();

  const contextHtml = Object.entries(context)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">🚨 Vextra AI System Error</h2>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #991b1b;">${error.name || "Error"}</h3>
        <p style="margin: 0; color: #b91c1c;">${error.message}</p>
      </div>

      <h3>Context</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td><strong>Error ID</strong></td><td><code>${errorId}</code></td></tr>
        <tr><td><strong>Timestamp</strong></td><td>${timestamp}</td></tr>
        ${contextHtml}
      </table>

      <h3>Stack Trace</h3>
      <pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 12px;">
${error.stack || "No stack trace available"}
      </pre>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #64748b; font-size: 12px;">
        This is an automated notification from Vextra AI error monitoring.
      </p>
    </div>
  `;

  await sendEmail({
    to: DEVELOPER_EMAIL,
    subject: `[Vextra AI] System Error: ${error.message.slice(0, 50)}`,
    html,
    text: `Error: ${error.message}\n\nError ID: ${errorId}\nTimestamp: ${timestamp}\n\nStack:\n${error.stack}`,
  });
}

/**
 * Notify developer of an extraction error
 */
export async function notifyExtractionError(
  documentId: string,
  error: Error,
  context: ErrorContext = {}
): Promise<void> {
  await notifyDeveloperError(error, {
    ...context,
    documentId,
    action: "document_extraction",
  });
}

/**
 * Send user notification email
 */
export async function sendUserNotification(
  userEmail: string,
  subject: string,
  message: string
): Promise<boolean> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 24px 0;">
        <div style="display: inline-block; background: #6366f1; color: white; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 24px; font-weight: bold;">
          V
        </div>
      </div>
      
      <div style="padding: 24px;">
        ${message}
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #64748b; font-size: 12px; text-align: center;">
        Vextra AI - Intelligent Document Extraction
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `[Vextra AI] ${subject}`,
    html,
  });
}

/**
 * Send batch processing complete notification
 */
export async function notifyBatchComplete(
  userEmail: string,
  stats: { total: number; success: number; failed: number }
): Promise<boolean> {
  const message = `
    <h2>Din batch-bearbetning är klar!</h2>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0;"><strong>Totalt:</strong> ${stats.total} dokument</p>
      <p style="margin: 8px 0 0 0;"><strong>Lyckades:</strong> ${stats.success}</p>
      ${stats.failed > 0 ? `<p style="margin: 8px 0 0 0; color: #dc2626;"><strong>Misslyckades:</strong> ${stats.failed}</p>` : ""}
    </div>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.vextra.ai"}/dashboard" style="color: #6366f1;">Gå till dashboard →</a></p>
  `;

  return sendUserNotification(userEmail, "Batch-bearbetning klar", message);
}
