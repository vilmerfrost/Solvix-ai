"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Plus, Trash2, Play } from "lucide-react";

interface ConnectorRow {
  id: string;
  provider: "sharepoint" | "google_drive";
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
}

interface SchemaRow {
  id: string;
  name: string;
  doc_type: string;
  status: "draft" | "published" | "archived";
  current_version: number;
}

interface SlaRow {
  id?: string;
  doc_type: string;
  warning_minutes: number;
  breach_minutes: number;
  enabled: boolean;
}

const DOC_TYPE_OPTIONS = [
  "invoice",
  "po",
  "credit_note",
  "receipt",
  "contract",
  "nda",
  "employment_agreement",
  "ticket_incident",
  "ticket_change",
  "unknown_office",
];

export function OfficeAdminPanel() {
  const [activeTab, setActiveTab] = useState<"connectors" | "schemas" | "sla">("connectors");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [newConnectorProvider, setNewConnectorProvider] = useState<"sharepoint" | "google_drive">("sharepoint");
  const [newConnectorName, setNewConnectorName] = useState("");
  const [newConnectorCredentials, setNewConnectorCredentials] = useState("{}");

  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [newSchemaDocType, setNewSchemaDocType] = useState("invoice");
  const [schemaDefinitionById, setSchemaDefinitionById] = useState<Record<string, string>>({});

  const [slaRules, setSlaRules] = useState<SlaRow[]>([]);

  const clearNotice = () => {
    setError(null);
    setMessage(null);
  };

  const loadConnectors = useCallback(async () => {
    const res = await fetch("/api/ingestion/connectors");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to load connectors");
    setConnectors(json.connectors || []);
  }, []);

  const loadSchemas = useCallback(async () => {
    const res = await fetch("/api/schemas");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to load schemas");
    const rows: SchemaRow[] = json.schemas || [];
    setSchemas(rows);
    setSchemaDefinitionById((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (!next[row.id]) {
          next[row.id] = JSON.stringify(
            {
              version: row.current_version || 1,
              docType: row.doc_type,
              fields: [],
              tables: [],
              rules: [],
            },
            null,
            2
          );
        }
      }
      return next;
    });
  }, []);

  const loadSla = useCallback(async () => {
    const res = await fetch("/api/sla/rules");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to load SLA rules");
    setSlaRules(json.rules || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    clearNotice();
    try {
      await Promise.all([loadConnectors(), loadSchemas(), loadSla()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadConnectors, loadSchemas, loadSla]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const connectorTemplate = useMemo(() => {
    if (newConnectorProvider === "sharepoint") {
      return JSON.stringify(
        {
          tenantId: "",
          clientId: "",
          clientSecret: "",
          siteId: "",
          driveId: "",
          folderPath: "/",
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        refreshToken: "",
        clientId: "",
        clientSecret: "",
        folderId: "root",
      },
      null,
      2
    );
  }, [newConnectorProvider]);

  useEffect(() => {
    if (newConnectorCredentials.trim() === "{}") {
      setNewConnectorCredentials(connectorTemplate);
    }
  }, [connectorTemplate, newConnectorCredentials]);

  const createConnector = async () => {
    clearNotice();
    try {
      const credentials = JSON.parse(newConnectorCredentials);
      const res = await fetch("/api/ingestion/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newConnectorProvider,
          name: newConnectorName || `${newConnectorProvider}-${Date.now()}`,
          credentials,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create connector");
      setMessage("Connector saved");
      setNewConnectorName("");
      setNewConnectorCredentials(connectorTemplate);
      await loadConnectors();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const testConnector = async (connectorId: string) => {
    clearNotice();
    const res = await fetch("/api/ingestion/connectors/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Connector test failed");
      return;
    }
    setMessage("Connector test passed");
  };

  const syncProvider = async (provider: "sharepoint" | "google_drive") => {
    clearNotice();
    const route = provider === "sharepoint" ? "/api/ingestion/sharepoint/sync" : "/api/ingestion/drive/sync";
    const res = await fetch(route, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Sync failed");
      return;
    }
    setMessage(
      `Sync complete: imported ${json.imported ?? 0}, skipped ${json.skipped ?? 0}, failed ${json.failed ?? 0}`
    );
    await loadConnectors();
  };

  const deleteConnector = async (connectorId: string) => {
    clearNotice();
    const res = await fetch(`/api/ingestion/connectors?id=${connectorId}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Failed to delete connector");
      return;
    }
    setMessage("Connector deleted");
    await loadConnectors();
  };

  const createSchema = async () => {
    clearNotice();
    const definition = {
      version: 1,
      docType: newSchemaDocType,
      fields: [],
      tables: [],
      rules: [],
    };
    const res = await fetch("/api/schemas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSchemaName || `Schema ${newSchemaDocType}`,
        docType: newSchemaDocType,
        definition,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Failed to create schema");
      return;
    }
    setMessage("Schema created");
    setNewSchemaName("");
    await loadSchemas();
  };

  const saveSchemaDefinition = async (schemaId: string) => {
    clearNotice();
    try {
      const definition = JSON.parse(schemaDefinitionById[schemaId] || "{}");
      const res = await fetch(`/api/schemas/${schemaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save schema");
      setMessage("Schema version updated");
      await loadSchemas();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const publishSchema = async (schemaId: string) => {
    clearNotice();
    const res = await fetch(`/api/schemas/${schemaId}/publish`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Failed to publish schema");
      return;
    }
    setMessage(`Published version ${json.publishedVersion}`);
    await loadSchemas();
  };

  const upsertSla = async (row: SlaRow) => {
    clearNotice();
    const res = await fetch("/api/sla/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType: row.doc_type,
        warningMinutes: row.warning_minutes,
        breachMinutes: row.breach_minutes,
        enabled: row.enabled,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error || "Failed to save SLA rule");
      return;
    }
    setMessage(`SLA updated for ${row.doc_type}`);
    await loadSla();
  };

  if (loading) return <div className="p-6 text-slate-600">Loading Office/IT admin...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Office/IT Platform Admin</h1>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <div className="flex gap-2 border-b border-slate-200">
        <button className={`px-3 py-2 text-sm ${activeTab === "connectors" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-600"}`} onClick={() => setActiveTab("connectors")}>Connectors</button>
        <button className={`px-3 py-2 text-sm ${activeTab === "schemas" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-600"}`} onClick={() => setActiveTab("schemas")}>Schemas</button>
        <button className={`px-3 py-2 text-sm ${activeTab === "sla" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-600"}`} onClick={() => setActiveTab("sla")}>SLA</button>
      </div>

      {activeTab === "connectors" && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="font-medium text-slate-900">Add Connector</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={newConnectorProvider}
                onChange={(e) => {
                  const provider = e.target.value as "sharepoint" | "google_drive";
                  setNewConnectorProvider(provider);
                  setNewConnectorCredentials(
                    provider === "sharepoint"
                      ? JSON.stringify({ tenantId: "", clientId: "", clientSecret: "", siteId: "", driveId: "", folderPath: "/" }, null, 2)
                      : JSON.stringify({ refreshToken: "", clientId: "", clientSecret: "", folderId: "root" }, null, 2)
                  );
                }}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              >
                <option value="sharepoint">SharePoint</option>
                <option value="google_drive">Google Drive</option>
              </select>
              <input
                value={newConnectorName}
                onChange={(e) => setNewConnectorName(e.target.value)}
                placeholder="Connector name"
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
              <button onClick={createConnector} className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                Save Connector
              </button>
            </div>
            <textarea
              value={newConnectorCredentials}
              onChange={(e) => setNewConnectorCredentials(e.target.value)}
              rows={10}
              className="w-full rounded border border-slate-300 px-2 py-2 font-mono text-xs"
            />
          </div>

          <div className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-slate-900">Configured Connectors</h2>
            <div className="space-y-2">
              {connectors.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2">
                  <div>
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.provider} · {c.is_active ? "active" : "inactive"} · last sync: {c.last_sync_at || "never"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => testConnector(c.id)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      <Play className="h-3.5 w-3.5" />
                      Test
                    </button>
                    <button onClick={() => syncProvider(c.provider)} className="inline-flex items-center gap-1 rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync
                    </button>
                    <button onClick={() => deleteConnector(c.id)} className="inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {connectors.length === 0 && <div className="text-sm text-slate-500">No connectors configured.</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "schemas" && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-slate-900">Create Schema</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="Schema name"
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
              <select
                value={newSchemaDocType}
                onChange={(e) => setNewSchemaDocType(e.target.value)}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              >
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <button onClick={createSchema} className="inline-flex items-center justify-center gap-2 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {schemas.map((schema) => (
              <div key={schema.id} className="rounded border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{schema.name}</div>
                    <div className="text-xs text-slate-500">
                      {schema.doc_type} · version {schema.current_version} · {schema.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveSchemaDefinition(schema.id)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      <Save className="h-3.5 w-3.5" />
                      Save Version
                    </button>
                    <button onClick={() => publishSchema(schema.id)} className="inline-flex items-center gap-1 rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                      <Play className="h-3.5 w-3.5" />
                      Publish
                    </button>
                  </div>
                </div>
                <textarea
                  value={schemaDefinitionById[schema.id] || ""}
                  onChange={(e) => setSchemaDefinitionById((prev) => ({ ...prev, [schema.id]: e.target.value }))}
                  rows={12}
                  className="w-full rounded border border-slate-300 px-2 py-2 font-mono text-xs"
                />
              </div>
            ))}
            {schemas.length === 0 && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">No schemas yet.</div>}
          </div>
        </div>
      )}

      {activeTab === "sla" && (
        <div className="space-y-2">
          {(slaRules.length > 0 ? slaRules : DOC_TYPE_OPTIONS.map((docType) => ({ doc_type: docType, warning_minutes: 60, breach_minutes: 240, enabled: true }))).map((row) => (
            <div key={row.doc_type} className="rounded border border-slate-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-5 md:items-center">
                <div className="font-medium text-slate-800">{row.doc_type}</div>
                <input
                  type="number"
                  min={5}
                  defaultValue={row.warning_minutes}
                  onChange={(e) => {
                    const value = Number(e.target.value || "0");
                    setSlaRules((prev) =>
                      prev.map((r) => (r.doc_type === row.doc_type ? { ...r, warning_minutes: value } : r))
                    );
                  }}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={5}
                  defaultValue={row.breach_minutes}
                  onChange={(e) => {
                    const value = Number(e.target.value || "0");
                    setSlaRules((prev) =>
                      prev.map((r) => (r.doc_type === row.doc_type ? { ...r, breach_minutes: value } : r))
                    );
                  }}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    defaultChecked={row.enabled}
                    onChange={(e) =>
                      setSlaRules((prev) =>
                        prev.map((r) => (r.doc_type === row.doc_type ? { ...r, enabled: e.target.checked } : r))
                      )
                    }
                  />
                  enabled
                </label>
                <button
                  onClick={() => {
                    const current =
                      slaRules.find((r) => r.doc_type === row.doc_type) ||
                      ({ doc_type: row.doc_type, warning_minutes: row.warning_minutes, breach_minutes: row.breach_minutes, enabled: row.enabled } as SlaRow);
                    upsertSla(current);
                  }}
                  className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Save
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500">warning minutes / breach minutes</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
