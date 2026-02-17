"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, XCircle, RefreshCw } from "lucide-react";

export function OfficeDocumentReview({
  documentId,
  filename,
  extractedData,
  taskId,
}: {
  documentId: string;
  filename: string;
  extractedData: Record<string, unknown>;
  taskId: string | null;
}) {
  const router = useRouter();
  const initialFields = useMemo(() => {
    const fields = extractedData?.fields;
    if (!fields || typeof fields !== "object") return {} as Record<string, string>;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
      result[k] = v === undefined || v === null ? "" : String(v);
    }
    return result;
  }, [extractedData]);

  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/review/update-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, fields }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.error || "Failed to save fields");
      return;
    }
    setNotice("Fields saved");
  };

  const transition = async (kind: "approve" | "reject" | "request-changes") => {
    if (!taskId) {
      setError("No review task found for this document");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/review/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        documentId,
        ...(kind === "reject" ? { reason: "Rejected from document review" } : {}),
        ...(kind === "request-changes" ? { note: "Requested changes from document review" } : {}),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.error || `Failed to ${kind}`);
      return;
    }
    setNotice(`Document ${kind} completed`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Office/IT Review</h2>
        <p className="text-sm text-slate-500">{filename}</p>
      </div>

      {notice && <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Field</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(fields).map(([key, value]) => (
              <tr key={key} className="border-t border-slate-100">
                <td className="px-3 py-2 text-sm font-medium text-slate-700">{key}</td>
                <td className="px-3 py-2">
                  <input
                    value={value}
                    onChange={(e) => setField(key, e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </td>
              </tr>
            ))}
            {Object.keys(fields).length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-sm text-slate-500">
                  No schema fields found for this document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          <Save className="h-4 w-4" />
          Save
        </button>
        <button onClick={() => transition("request-changes")} disabled={saving} className="inline-flex items-center gap-1 rounded border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50">
          <RefreshCw className="h-4 w-4" />
          Request Changes
        </button>
        <button onClick={() => transition("reject")} disabled={saving} className="inline-flex items-center gap-1 rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
          <XCircle className="h-4 w-4" />
          Reject
        </button>
        <button onClick={() => transition("approve")} disabled={saving} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
          <Check className="h-4 w-4" />
          Approve
        </button>
      </div>
    </div>
  );
}
