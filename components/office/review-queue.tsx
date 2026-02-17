"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, XCircle, UserPlus, Save } from "lucide-react";

interface ReviewTaskDoc {
  id: string;
  filename: string;
  status: string;
  doc_type: string | null;
  document_domain: string | null;
  extracted_data: Record<string, unknown> | null;
  created_at: string;
  due_at: string | null;
}

interface ReviewTask {
  id: string;
  status: string;
  assigned_to: string | null;
  due_at: string | null;
  documents: ReviewTaskDoc | null;
}

export function ReviewQueue() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignee, setAssignee] = useState("");
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const selectedDocument = selectedTask?.documents || null;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review/tasks?limit=100");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load tasks");
      const rows: ReviewTask[] = json.tasks || [];
      setTasks(rows);
      if (rows.length > 0) {
        setSelectedTaskId((prev) => prev || rows[0].id);
      } else {
        setSelectedTaskId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!selectedDocument) {
      setEditableFields({});
      setAssignee("");
      return;
    }
    const extracted = selectedDocument.extracted_data || {};
    const fields = (extracted.fields || {}) as Record<string, unknown>;
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      normalized[key] = value === null || value === undefined ? "" : String(value);
    }
    setEditableFields(normalized);
    setAssignee(selectedTask?.assigned_to || "");
  }, [selectedDocument, selectedTask?.assigned_to]);

  const updateField = (key: string, value: string) => {
    setEditableFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveFields = async () => {
    if (!selectedDocument) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/review/update-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: selectedDocument.id,
        fields: editableFields,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.error || "Failed to save fields");
      return;
    }
    setNotice("Fields saved");
    await loadTasks();
  };

  const assignTask = async () => {
    if (!selectedTask || !selectedDocument) return;
    setSaving(true);
    const res = await fetch("/api/review/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: selectedDocument.id,
        assignedTo: assignee || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.error || "Assignment failed");
      return;
    }
    setNotice("Task assigned");
    await loadTasks();
  };

  const transition = async (kind: "approve" | "reject" | "request-changes") => {
    if (!selectedTask || !selectedDocument) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      taskId: selectedTask.id,
      documentId: selectedDocument.id,
    };
    if (kind === "reject") body.reason = "Rejected from review queue";
    if (kind === "request-changes") body.note = "Requested changes from review queue";

    const res = await fetch(`/api/review/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) {
      setError(json.error || `${kind} failed`);
      return;
    }
    setNotice(`Task ${kind} completed`);
    await loadTasks();
  };

  if (loading) return <div className="p-6 text-slate-600">Loading review queue...</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <h2 className="text-sm font-semibold text-slate-900">Review Tasks</h2>
          <button onClick={loadTasks} className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className={`w-full border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${
                task.id === selectedTaskId ? "bg-indigo-50" : ""
              }`}
            >
              <div className="text-sm font-medium text-slate-900">{task.documents?.filename || "Unknown document"}</div>
              <div className="mt-1 text-xs text-slate-500">
                {task.documents?.doc_type || "unknown"} · {task.status}
              </div>
            </button>
          ))}
          {tasks.length === 0 && <div className="p-4 text-sm text-slate-500">No tasks found.</div>}
        </div>
      </div>

      <div className="lg:col-span-2 rounded border border-slate-200 bg-white p-4">
        {!selectedTask || !selectedDocument ? (
          <div className="text-sm text-slate-500">Select a task to review.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedDocument.filename}</h2>
                <p className="text-xs text-slate-500">
                  {selectedDocument.doc_type || "unknown"} · {selectedTask.status} · due {selectedTask.due_at || "n/a"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Assign to user id"
                  className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                />
                <button onClick={assignTask} disabled={saving} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </button>
              </div>
            </div>

            {notice && <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}
            {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

            <div className="rounded border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Field</th>
                    <th className="px-3 py-2 text-left">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(editableFields).map(([key, value]) => (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{key}</td>
                      <td className="px-3 py-2">
                        <input
                          value={value}
                          onChange={(e) => updateField(key, e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                  {Object.keys(editableFields).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-3 text-sm text-slate-500">
                        No extracted fields found. Run processing first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={saveFields} disabled={saving} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <Save className="h-4 w-4" />
                Save Fields
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
        )}
      </div>
    </div>
  );
}
