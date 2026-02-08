/**
 * Duplicate Detection
 * Detects duplicate documents using content hashing and field matching.
 *
 * Two detection methods:
 * 1. EXACT: SHA-256 hash of file content (catches identical re-uploads)
 * 2. FUZZY: Match on key fields (catches same invoice from different sources)
 */

import crypto from 'crypto';
import { createServiceRoleClient } from './supabase';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: 'exact' | 'high' | 'medium' | 'none';
  matchedDocumentId?: string;
  matchedFilename?: string;
  matchedDate?: string;
  reason?: string;
}

/** Generate SHA-256 hash of file content */
export function generateContentHash(content: Buffer | string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/** Check for duplicates of a document */
export async function checkForDuplicate(
  userId: string,
  contentHash: string,
  extractedData?: any,
  filename?: string,
): Promise<DuplicateCheckResult> {
  const supabase = createServiceRoleClient();

  // CHECK 1: Exact content hash match (identical file)
  const { data: exactMatches } = await supabase
    .from('documents')
    .select('id, filename, created_at')
    .eq('user_id', userId)
    .eq('content_hash', contentHash)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1);

  if (exactMatches && exactMatches.length > 0) {
    return {
      isDuplicate: true,
      confidence: 'exact',
      matchedDocumentId: exactMatches[0].id,
      matchedFilename: exactMatches[0].filename,
      matchedDate: exactMatches[0].created_at,
      reason: 'Identisk fil har redan laddats upp',
    };
  }

  // CHECK 2: Invoice field matching (same invoice, different file)
  if (extractedData) {
    const invoiceNumber = extractedData.invoiceNumber?.value;
    const supplier = extractedData.supplier?.value;
    const totalAmount = extractedData.totalAmount?.value;

    if (invoiceNumber && supplier) {
      const { data: fieldMatches } = await supabase
        .from('documents')
        .select('id, filename, created_at, extracted_data')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fieldMatches) {
        for (const doc of fieldMatches) {
          const docData = doc.extracted_data || {};
          const docInvoiceNr = docData.invoiceNumber?.value;
          const docSupplier = docData.supplier?.value;

          if (docInvoiceNr && docInvoiceNr === invoiceNumber &&
              docSupplier && docSupplier.toLowerCase() === supplier.toLowerCase()) {
            return {
              isDuplicate: true,
              confidence: 'high',
              matchedDocumentId: doc.id,
              matchedFilename: doc.filename,
              matchedDate: doc.created_at,
              reason: `Faktura ${invoiceNumber} från ${supplier} finns redan`,
            };
          }

          const docAmount = docData.totalAmount?.value;
          if (docSupplier && docSupplier.toLowerCase() === supplier.toLowerCase() &&
              docAmount && totalAmount && Math.abs(docAmount - totalAmount) < 0.01) {
            return {
              isDuplicate: true,
              confidence: 'medium',
              matchedDocumentId: doc.id,
              matchedFilename: doc.filename,
              matchedDate: doc.created_at,
              reason: `Samma leverantör (${supplier}) och belopp (${totalAmount} kr) — möjlig dubblett`,
            };
          }
        }
      }
    }

    // CHECK 3: Waste document matching (same date + supplier + weight)
    const wasteDate = extractedData.date?.value;
    const wasteSupplier = extractedData.supplier?.value;
    const wasteWeight = extractedData.weightKg?.value;

    if (wasteDate && wasteSupplier && wasteWeight) {
      const { data: wasteMatches } = await supabase
        .from('documents')
        .select('id, filename, created_at, extracted_data')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(50);

      if (wasteMatches) {
        for (const doc of wasteMatches) {
          const docData = doc.extracted_data || {};
          if (docData.date?.value === wasteDate &&
              docData.supplier?.value?.toLowerCase() === wasteSupplier.toLowerCase() &&
              docData.weightKg?.value && Math.abs(docData.weightKg.value - wasteWeight) < 0.1) {
            return {
              isDuplicate: true,
              confidence: 'high',
              matchedDocumentId: doc.id,
              matchedFilename: doc.filename,
              matchedDate: doc.created_at,
              reason: `Samma datum, leverantör och vikt — möjlig dubblett`,
            };
          }
        }
      }
    }
  }

  // CHECK 4: Filename match
  if (filename) {
    const { data: nameMatches } = await supabase
      .from('documents')
      .select('id, filename, created_at')
      .eq('user_id', userId)
      .eq('filename', filename)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(1);

    if (nameMatches && nameMatches.length > 0) {
      return {
        isDuplicate: true,
        confidence: 'medium',
        matchedDocumentId: nameMatches[0].id,
        matchedFilename: nameMatches[0].filename,
        matchedDate: nameMatches[0].created_at,
        reason: `Fil med samma namn har redan laddats upp`,
      };
    }
  }

  return { isDuplicate: false, confidence: 'none' };
}
