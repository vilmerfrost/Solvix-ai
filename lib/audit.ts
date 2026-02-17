/**
 * Audit Trail
 * Logs all user actions for compliance and transparency.
 * Non-blocking — failures are logged but don't break the flow.
 */

import { createServiceRoleClient } from './supabase';

export type AuditAction =
  | 'document.uploaded'
  | 'document.processed'
  | 'document.classified'
  | 'document.reviewed'
  | 'document.review_assigned'
  | 'document.review_requested_changes'
  | 'document.approved'
  | 'document.rejected'
  | 'document.exported'
  | 'document.archived'
  | 'document.deleted'
  | 'document.edited'
  | 'document.duplicate_detected'
  | 'export.excel'
  | 'export.csv'
  | 'export.fortnox'
  | 'export.azure'
  | 'sla.breach_risk'
  | 'sla.breached'
  | 'settings.changed'
  | 'user.login'
  | 'user.api_key_added'
  | 'user.api_key_removed';

interface AuditLogEntry {
  userId: string;
  documentId?: string;
  action: AuditAction;
  description?: string;
  metadata?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
}

/** Log an audit event (non-blocking) */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('audit_log').insert({
      user_id: entry.userId,
      document_id: entry.documentId || null,
      action: entry.action,
      description: entry.description || null,
      metadata: entry.metadata || {},
      changes: entry.changes || null,
    });
  } catch (err) {
    console.warn('[AUDIT] Failed to log event:', entry.action, err);
  }
}

export async function auditDocumentUpload(userId: string, documentId: string, filename: string) {
  await logAuditEvent({
    userId, documentId,
    action: 'document.uploaded',
    description: `Laddade upp ${filename}`,
    metadata: { filename },
  });
}

export async function auditDocumentProcessed(
  userId: string, documentId: string, model: string,
  confidence: number, documentType?: string,
) {
  await logAuditEvent({
    userId, documentId,
    action: 'document.processed',
    description: `Extraherade data med ${model} (${Math.round(confidence * 100)}% säkerhet)`,
    metadata: { model, confidence, documentType },
  });
}

export async function auditDocumentEdited(
  userId: string, documentId: string,
  changes: Record<string, { old: any; new: any }>,
) {
  const changedFields = Object.keys(changes);
  await logAuditEvent({
    userId, documentId,
    action: 'document.edited',
    description: `Redigerade ${changedFields.length} fält: ${changedFields.join(', ')}`,
    changes,
  });
}

export async function auditDocumentApproved(userId: string, documentId: string, auto: boolean) {
  await logAuditEvent({
    userId, documentId,
    action: 'document.approved',
    description: auto ? 'Auto-godkänd (hög säkerhet)' : 'Manuellt godkänd',
    metadata: { auto },
  });
}

export async function auditExport(
  userId: string, format: 'excel' | 'csv' | 'fortnox' | 'azure',
  documentCount: number, documentIds?: string[],
) {
  await logAuditEvent({
    userId,
    action: `export.${format}` as AuditAction,
    description: `Exporterade ${documentCount} dokument som ${format.toUpperCase()}`,
    metadata: { format, documentCount, documentIds },
  });
}

export async function auditDuplicateDetected(
  userId: string, documentId: string,
  matchedDocumentId: string, confidence: string, reason: string,
) {
  await logAuditEvent({
    userId, documentId,
    action: 'document.duplicate_detected',
    description: reason,
    metadata: { matchedDocumentId, confidence },
  });
}

/** Get audit log for a user (paginated) */
export async function getAuditLog(
  userId: string,
  options: {
    documentId?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  } = {},
) {
  const supabase = createServiceRoleClient();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.documentId) query = query.eq('document_id', options.documentId);
  if (options.action) query = query.eq('action', options.action);

  const { data, error } = await query;
  return { data: data || [], error };
}
