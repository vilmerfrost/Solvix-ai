import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase";
import { decryptAPIKey } from "@/lib/encryption";

export type ConnectorProvider = "sharepoint" | "google_drive";

interface SyncCandidate {
  sourceItemId: string;
  sourcePath: string;
  filename: string;
  bytes: Buffer;
  modifiedAt: string;
  contentType: string;
}

interface ConnectorCredentials {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  siteId?: string;
  driveId?: string;
  folderPath?: string;
  folderId?: string;
}

function hashBuffer(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function parseCredentials(raw: string): ConnectorCredentials {
  try {
    return JSON.parse(raw) as ConnectorCredentials;
  } catch {
    throw new Error("Connector credentials must be valid JSON");
  }
}

function ensureString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim() !== "") return value;
  throw new Error(`Missing credential field: ${field}`);
}

async function loadConnectorAccount(userId: string, provider: ConnectorProvider) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("connector_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error || !data) throw error || new Error(`${provider} connector not configured`);
  return data;
}

async function sharePointToken(credentials: ConnectorCredentials): Promise<string> {
  if (credentials.accessToken) return credentials.accessToken;

  const tenantId = ensureString(credentials.tenantId, "tenantId");
  const clientId = ensureString(credentials.clientId, "clientId");
  const clientSecret = ensureString(credentials.clientSecret, "clientSecret");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  if (!response.ok) {
    throw new Error(`SharePoint token request failed (${response.status})`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("SharePoint token response missing access_token");
  return data.access_token;
}

async function listSharePointFiles(credentials: ConnectorCredentials): Promise<SyncCandidate[]> {
  const token = await sharePointToken(credentials);
  const siteId = ensureString(credentials.siteId, "siteId");
  const driveId = ensureString(credentials.driveId, "driveId");
  const root = credentials.folderPath && credentials.folderPath.trim() !== "" ? credentials.folderPath : "/";
  const headers = { Authorization: `Bearer ${token}` };

  const queue: string[] = [root];
  const files: SyncCandidate[] = [];

  while (queue.length > 0) {
    const folderPath = queue.shift()!;
    const encoded = folderPath
      .split("/")
      .filter(Boolean)
      .map((p) => encodeURIComponent(p))
      .join("/");
    const url =
      encoded.length > 0
        ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${encoded}:/children`
        : `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`;

    const listResp = await fetch(url, { headers });
    if (!listResp.ok) {
      throw new Error(`SharePoint list failed for "${folderPath}" (${listResp.status})`);
    }
    const listData = (await listResp.json()) as { value?: Array<Record<string, unknown>> };

    for (const item of listData.value || []) {
      const id = item.id;
      const name = item.name;
      if (typeof id !== "string" || typeof name !== "string") continue;

      if (item.folder && typeof item.folder === "object") {
        const childPath = folderPath === "/" ? `/${name}` : `${folderPath.replace(/\/$/, "")}/${name}`;
        queue.push(childPath);
        continue;
      }

      if (!(item.file && typeof item.file === "object")) continue;

      const contentResp = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${id}/content`,
        { headers }
      );
      if (!contentResp.ok) {
        throw new Error(`SharePoint file download failed for "${name}" (${contentResp.status})`);
      }

      const filePath = folderPath === "/" ? `/${name}` : `${folderPath}/${name}`;
      files.push({
        sourceItemId: id,
        sourcePath: filePath,
        filename: name,
        bytes: Buffer.from(await contentResp.arrayBuffer()),
        modifiedAt:
          typeof item.lastModifiedDateTime === "string"
            ? item.lastModifiedDateTime
            : new Date().toISOString(),
        contentType: contentResp.headers.get("content-type") || "application/octet-stream",
      });
    }
  }

  return files;
}

async function googleDriveToken(credentials: ConnectorCredentials): Promise<string> {
  if (credentials.accessToken) return credentials.accessToken;

  const refreshToken = ensureString(credentials.refreshToken, "refreshToken");
  const clientId = ensureString(credentials.clientId, "clientId");
  const clientSecret = ensureString(credentials.clientSecret, "clientSecret");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token request failed (${response.status})`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google token response missing access_token");
  return data.access_token;
}

async function listGoogleDriveFiles(credentials: ConnectorCredentials): Promise<SyncCandidate[]> {
  const token = await googleDriveToken(credentials);
  const rootFolderId = credentials.folderId && credentials.folderId.trim() !== "" ? credentials.folderId : "root";
  const headers = { Authorization: `Bearer ${token}` };
  const queue: Array<{ id: string; path: string }> = [{ id: rootFolderId, path: "/" }];
  const files: SyncCandidate[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${current.id}' in parents and trashed = false`,
        pageSize: "200",
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime)",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const listResp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, { headers });
      if (!listResp.ok) {
        throw new Error(`Google Drive list failed (${listResp.status})`);
      }
      const listData = (await listResp.json()) as {
        nextPageToken?: string;
        files?: Array<{ id: string; name: string; mimeType: string; modifiedTime?: string }>;
      };

      for (const file of listData.files || []) {
        const filePath = current.path === "/" ? `/${file.name}` : `${current.path}/${file.name}`;
        if (file.mimeType === "application/vnd.google-apps.folder") {
          queue.push({ id: file.id, path: filePath });
          continue;
        }

        const downloadResp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
          { headers }
        );
        if (!downloadResp.ok) {
          throw new Error(`Google Drive file download failed for "${file.name}" (${downloadResp.status})`);
        }

        files.push({
          sourceItemId: file.id,
          sourcePath: filePath,
          filename: file.name,
          bytes: Buffer.from(await downloadResp.arrayBuffer()),
          modifiedAt: file.modifiedTime || new Date().toISOString(),
          contentType: downloadResp.headers.get("content-type") || "application/octet-stream",
        });
      }

      pageToken = listData.nextPageToken || "";
    } while (pageToken);
  }

  return files;
}

async function fetchCandidates(provider: ConnectorProvider, credentials: ConnectorCredentials): Promise<SyncCandidate[]> {
  if (provider === "sharepoint") return listSharePointFiles(credentials);
  return listGoogleDriveFiles(credentials);
}

export async function syncConnectorToDocuments(params: {
  userId: string;
  provider: ConnectorProvider;
}): Promise<{ jobId: string; imported: number; skipped: number; failed: number }> {
  const supabase = createServiceRoleClient();
  const account = await loadConnectorAccount(params.userId, params.provider);

  const decrypted = decryptAPIKey(account.encrypted_credentials);
  if (!decrypted) throw new Error(`Unable to decrypt ${params.provider} credentials`);
  const credentials = parseCredentials(decrypted);

  const { data: job, error: jobError } = await supabase
    .from("connector_sync_jobs")
    .insert({
      account_id: account.id,
      user_id: params.userId,
      provider: params.provider,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (jobError || !job) throw jobError || new Error("Failed to create sync job");

  const candidates = await fetchCandidates(params.provider, credentials);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of candidates) {
    try {
      const contentHash = hashBuffer(item.bytes);
      const { data: existing } = await supabase
        .from("connector_sync_items")
        .select("id")
        .eq("account_id", account.id)
        .eq("source_item_id", item.sourceItemId)
        .eq("content_hash", contentHash)
        .maybeSingle();

      if (existing) {
        skipped += 1;
        await supabase.from("connector_sync_items").insert({
          job_id: job.id,
          account_id: account.id,
          user_id: params.userId,
          source_item_id: item.sourceItemId,
          source_path: item.sourcePath,
          content_hash: contentHash,
          status: "skipped",
        });
        continue;
      }

      const ext = item.filename.includes(".") ? item.filename.split(".").pop() : "bin";
      const storagePath = `${params.userId}/connector-${params.provider}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("raw_documents")
        .upload(storagePath, item.bytes, { contentType: item.contentType, upsert: false });
      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: params.userId,
          filename: item.filename,
          storage_path: storagePath,
          status: "uploaded",
          document_domain: "office_it",
          doc_type: "unknown_office",
          review_status: "new",
          extracted_data: {
            source: "connector_sync",
            connector: params.provider,
            source_item_id: item.sourceItemId,
            source_path: item.sourcePath,
            source_modified_at: item.modifiedAt,
          },
        })
        .select()
        .single();
      if (docError || !doc) throw docError || new Error("Failed to create document row");

      await supabase.from("connector_sync_items").insert({
        job_id: job.id,
        account_id: account.id,
        user_id: params.userId,
        source_item_id: item.sourceItemId,
        source_path: item.sourcePath,
        content_hash: contentHash,
        document_id: doc.id,
        status: "processed",
      });

      imported += 1;
    } catch (error) {
      failed += 1;
      await supabase.from("connector_sync_items").insert({
        job_id: job.id,
        account_id: account.id,
        user_id: params.userId,
        source_item_id: item.sourceItemId,
        source_path: item.sourcePath,
        content_hash: hashBuffer(item.bytes),
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const jobStatus = failed > 0 && imported === 0 ? "failed" : "completed";
  await supabase
    .from("connector_sync_jobs")
    .update({
      status: jobStatus,
      finished_at: new Date().toISOString(),
      stats: { imported, skipped, failed, scanned: candidates.length },
    })
    .eq("id", job.id);

  await supabase
    .from("connector_accounts")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", account.id);

  return { jobId: job.id, imported, skipped, failed };
}
