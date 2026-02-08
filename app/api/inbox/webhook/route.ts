import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Inbound email webhook
 * Receives emails forwarded to docs@inbox.solvix.ai
 * Extracts PDF/Excel attachments and creates document records
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (
      process.env.INBOX_WEBHOOK_SECRET &&
      webhookSecret !== process.env.INBOX_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let emailData: any;

    if (contentType.includes("application/json")) {
      emailData = await request.json();
    } else {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Extract inbox code from subject: "VEXT-abc12345"
    const subject = emailData.Subject || emailData.subject || "";
    const fromAddress =
      emailData.From || emailData.from || emailData.FromFull?.Email || "";
    const codeMatch = subject.match(/VEXT-([a-z0-9]{8})/i);

    if (!codeMatch) {
      console.log(
        `[INBOX] No inbox code in subject: "${subject}" from ${fromAddress}`
      );
      return NextResponse.json({ message: "No inbox code found" }, { status: 200 });
    }

    const inboxCode = codeMatch[1].toLowerCase();

    // Look up user by inbox code
    const { data: settings } = await supabase
      .from("settings")
      .select("user_id, inbox_enabled, inbox_auto_process")
      .eq("inbox_code", inboxCode)
      .single();

    if (!settings || !settings.inbox_enabled) {
      console.log(`[INBOX] Invalid or disabled inbox code: ${inboxCode}`);
      return NextResponse.json({ message: "Invalid inbox code" }, { status: 200 });
    }

    const userId = settings.user_id;

    // Extract valid attachments (Postmark format)
    const attachments = emailData.Attachments || emailData.attachments || [];
    const validAttachments = attachments.filter((att: any) => {
      const name = (att.Name || att.filename || "").toLowerCase();
      const type = (att.ContentType || att.type || "").toLowerCase();
      return (
        name.endsWith(".pdf") ||
        name.endsWith(".xlsx") ||
        name.endsWith(".xls") ||
        name.endsWith(".csv") ||
        type.includes("pdf") ||
        type.includes("spreadsheet") ||
        type.includes("csv")
      );
    });

    // Log the email
    const { data: emailLog } = await supabase
      .from("email_log")
      .insert({
        user_id: userId,
        from_address: fromAddress,
        subject,
        attachments_count: validAttachments.length,
        status: validAttachments.length > 0 ? "processing" : "no_attachments",
      })
      .select("id")
      .single();

    if (validAttachments.length === 0) {
      return NextResponse.json({ message: "No valid attachments" }, { status: 200 });
    }

    // Process each attachment
    let documentsCreated = 0;

    for (const attachment of validAttachments) {
      try {
        const fileName =
          attachment.Name ||
          attachment.filename ||
          `email-${Date.now()}.pdf`;
        const content = attachment.Content || attachment.content;
        const buffer = Buffer.from(content, "base64");
        const storagePath = `${userId}/${Date.now()}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("raw_documents")
          .upload(storagePath, buffer, {
            contentType:
              attachment.ContentType || attachment.type || "application/pdf",
          });

        if (uploadError) {
          console.error(`[INBOX] Upload failed for ${fileName}:`, uploadError);
          continue;
        }

        const { error: docError } = await supabase.from("documents").insert({
          user_id: userId,
          filename: fileName,
          storage_path: storagePath,
          status: settings.inbox_auto_process ? "uploaded" : "uploaded",
          metadata: { source: "email", from: fromAddress, subject },
        });

        if (!docError) documentsCreated++;
      } catch (err) {
        console.error("[INBOX] Error processing attachment:", err);
      }
    }

    // Update email log
    if (emailLog?.id) {
      await supabase
        .from("email_log")
        .update({
          documents_created: documentsCreated,
          status: documentsCreated > 0 ? "completed" : "failed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", emailLog.id);
    }

    console.log(
      `[INBOX] Processed email from ${fromAddress}: ${documentsCreated} docs created`
    );

    return NextResponse.json({ success: true, documents_created: documentsCreated });
  } catch (err) {
    console.error("[INBOX] Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
