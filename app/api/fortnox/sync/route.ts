import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  delay,
  downloadFortnoxInvoicePdf,
  fetchFortnoxSupplierInvoices,
  getValidFortnoxAccessToken,
  processFortnoxDocument,
  type FortnoxConnectionRow,
} from "@/lib/fortnox";

export const maxDuration = 300;

function buildFilename(invoice: Record<string, unknown>) {
  const givenNumber = String(invoice.GivenNumber ?? "invoice");
  const invoiceNumber = String(invoice.InvoiceNumber ?? givenNumber);
  return `fortnox-${givenNumber}-${invoiceNumber}.pdf`.replace(/[^\w.-]+/g, "-");
}

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json().catch(() => ({}));
  const syncFromDate = typeof body?.syncFromDate === "string" ? body.syncFromDate : null;
  const supabase = createServiceRoleClient();

  const { data: connection, error: connectionError } = await supabase
    .from("fortnox_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json({ success: false, error: "Fortnox is not connected." }, { status: 404 });
  }

  const { data: log, error: logError } = await supabase
    .from("fortnox_sync_logs")
    .insert({
      connection_id: connection.id,
      user_id: user.id,
      status: "running",
      sync_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (logError || !log) {
    return NextResponse.json({ success: false, error: logError?.message || "Failed to create sync log." }, { status: 500 });
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const accessToken = await getValidFortnoxAccessToken(connection as FortnoxConnectionRow, supabase);
    const invoices = await fetchFortnoxSupplierInvoices(
      accessToken,
      syncFromDate || connection.sync_from_date || connection.last_sync_at || undefined
    );

    for (let index = 0; index < invoices.length; index += 1) {
      const invoice = invoices[index] as Record<string, unknown>;
      const givenNumber = String(invoice.GivenNumber ?? "");

      try {
        if (!givenNumber) {
          throw new Error("Missing Fortnox invoice number.");
        }

        const { data: existing } = await supabase
          .from("fortnox_sync_items")
          .select("id")
          .eq("connection_id", connection.id)
          .eq("fortnox_given_number", givenNumber)
          .maybeSingle();

        if (existing) {
          skipped += 1;
          continue;
        }

        const pdfBuffer = await downloadFortnoxInvoicePdf(accessToken, givenNumber);
        const storagePath = `${user.id}/fortnox-${Date.now()}-${crypto.randomUUID()}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("raw_documents")
          .upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: document, error: documentError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            filename: buildFilename(invoice),
            storage_path: storagePath,
            status: "uploaded",
            document_domain: "invoice",
            doc_type: "invoice",
            sender_name: invoice.SupplierName || null,
            document_date: invoice.InvoiceDate || null,
            total_cost: invoice.Total || null,
            extracted_data: {
              source: "fortnox",
              fortnox_given_number: givenNumber,
              fortnox_invoice_number: invoice.InvoiceNumber || null,
              fortnox_supplier_name: invoice.SupplierName || null,
              fortnox_invoice_date: invoice.InvoiceDate || null,
              fortnox_due_date: invoice.DueDate || null,
            },
          })
          .select("id")
          .single();

        if (documentError || !document) {
          throw documentError || new Error("Failed to create document.");
        }

        await processFortnoxDocument(document.id);

        const { error: syncItemError } = await supabase.from("fortnox_sync_items").insert({
          connection_id: connection.id,
          user_id: user.id,
          fortnox_given_number: givenNumber,
          fortnox_invoice_number: invoice.InvoiceNumber || null,
          fortnox_supplier_name: invoice.SupplierName || null,
          document_id: document.id,
          status: "processed",
        });

        if (syncItemError) {
          throw syncItemError;
        }

        imported += 1;
        await delay(250);
      } catch (invoiceError) {
        failed += 1;
        await supabase.from("fortnox_sync_items").upsert(
          {
            connection_id: connection.id,
            user_id: user.id,
            fortnox_given_number: givenNumber || `failed-${index}`,
            fortnox_invoice_number: invoice.InvoiceNumber || null,
            fortnox_supplier_name: invoice.SupplierName || null,
            status: "failed",
            error_message: invoiceError instanceof Error ? invoiceError.message : "Unknown Fortnox sync error.",
          },
          { onConflict: "connection_id,fortnox_given_number" }
        );
      }
    }

    await Promise.all([
      supabase
        .from("fortnox_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          sync_from_date: syncFromDate || connection.sync_from_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id),
      supabase
        .from("fortnox_sync_logs")
        .update({
          status: failed > 0 && imported === 0 ? "failed" : "completed",
          imported_count: imported,
          skipped_count: skipped,
          failed_count: failed,
          sync_finished_at: new Date().toISOString(),
        })
        .eq("id", log.id),
    ]);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      failed,
    });
  } catch (error) {
    await supabase
      .from("fortnox_sync_logs")
      .update({
        status: "failed",
        imported_count: imported,
        skipped_count: skipped,
        failed_count: failed,
        sync_finished_at: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Fortnox sync failed.",
      })
      .eq("id", log.id);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fortnox sync failed.",
      },
      { status: 500 }
    );
  }
}
