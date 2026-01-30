"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Play, 
  Loader2, 
  Check, 
  X, 
  Globe,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const AVAILABLE_EVENTS = [
  { id: "document.uploaded", label: "Dokument uppladdat", description: "När ett nytt dokument laddas upp" },
  { id: "document.processed", label: "Dokument bearbetat", description: "När AI-extraktion är klar" },
  { id: "document.approved", label: "Dokument godkänt", description: "När ett dokument godkänns" },
  { id: "document.rejected", label: "Dokument avvisat", description: "När ett dokument avvisas" },
  { id: "document.failed", label: "Bearbetning misslyckades", description: "När bearbetning misslyckas" },
  { id: "export.complete", label: "Export klar", description: "När export till Azure är klar" },
  { id: "batch.complete", label: "Batch klar", description: "När batch-bearbetning är klar" },
];

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  total_sent: number;
  total_success: number;
  total_failed: number;
  last_triggered_at: string | null;
  last_status: number | null;
}

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    generateSecret: true,
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch webhooks
  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks/config");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId 
        ? { id: editingId, ...formData }
        : formData;

      const res = await fetch("/api/webhooks/config", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: "", url: "", events: [], generateSecret: true });
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Failed to save webhook:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna webhook?")) return;

    try {
      await fetch(`/api/webhooks/config?id=${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch (error) {
      console.error("Failed to delete webhook:", error);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);

    try {
      const res = await fetch("/api/webhooks/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", webhookId: id }),
      });

      const result = await res.json();
      setTestResult({
        id,
        success: result.success,
        message: result.success 
          ? `Lyckades! Status ${result.status} (${result.responseTime}ms)`
          : `Misslyckades: ${result.error}`,
      });
    } catch (error) {
      setTestResult({
        id,
        success: false,
        message: "Kunde inte ansluta",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await fetch("/api/webhooks/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: webhook.id, is_active: !webhook.is_active }),
      });
      fetchWebhooks();
    } catch (error) {
      console.error("Failed to toggle webhook:", error);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingId(webhook.id);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      generateSecret: false,
    });
    setShowForm(true);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleEventSelection = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till inställningar
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Webhooks</h1>
              <p className="text-stone-500 mt-1">
                Skicka händelser till externa system som n8n, Zapier eller ditt eget API
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({ name: "", url: "", events: [], generateSecret: true });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Ny webhook
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              {editingId ? "Redigera webhook" : "Skapa ny webhook"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Namn
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Min webhook"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  required
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Händelser
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label
                      key={event.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.events.includes(event.id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.id)}
                        onChange={() => toggleEventSelection(event.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-stone-900">{event.label}</span>
                        <p className="text-xs text-stone-500">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {!editingId && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.generateSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, generateSecret: e.target.checked }))}
                  />
                  <span className="text-sm text-stone-700">Generera HMAC-signatur för säker verifiering</span>
                </label>
              )}
              
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || !formData.url}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Spara ändringar" : "Skapa webhook"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Webhooks List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
            <Globe className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">Inga webhooks</h3>
            <p className="text-stone-500 mb-4">
              Skapa en webhook för att börja skicka händelser till externa system
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Skapa din första webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${webhook.is_active ? "bg-emerald-500" : "bg-stone-300"}`} />
                    <div>
                      <h3 className="font-semibold text-stone-900">{webhook.name}</h3>
                      <p className="text-sm text-stone-500 font-mono">{webhook.url}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id}
                      className="p-2 text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Testa webhook"
                    >
                      {testing === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(webhook)}
                      className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Redigera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Ta bort"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Test result */}
                {testResult?.id === webhook.id && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    testResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}
                
                {/* Events */}
                <div className="mb-4">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Händelser</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-0.5 bg-stone-100 text-stone-700 text-xs rounded-md"
                      >
                        {AVAILABLE_EVENTS.find(e => e.id === event)?.label || event}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Secret */}
                {webhook.secret && (
                  <div className="mb-4">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">HMAC Secret</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="flex-1 px-3 py-2 bg-stone-50 rounded-lg text-sm font-mono text-stone-700">
                        {showSecrets[webhook.id] ? webhook.secret : "••••••••••••••••"}
                      </code>
                      <button
                        onClick={() => setShowSecrets(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                        className="p-2 text-stone-500 hover:text-stone-700"
                      >
                        {showSecrets[webhook.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(webhook.secret!, webhook.id)}
                        className="p-2 text-stone-500 hover:text-stone-700"
                      >
                        {copied === webhook.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-stone-500">Skickade:</span>{" "}
                    <span className="font-medium text-stone-900">{webhook.total_sent}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Lyckade:</span>{" "}
                    <span className="font-medium text-emerald-600">{webhook.total_success}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Misslyckade:</span>{" "}
                    <span className="font-medium text-red-600">{webhook.total_failed}</span>
                  </div>
                  
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleActive(webhook)}
                    className={`ml-auto px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      webhook.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {webhook.is_active ? "Aktiv" : "Pausad"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
