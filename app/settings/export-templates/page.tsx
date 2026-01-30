"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  Loader2, 
  GripVertical,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileJson,
  FileText,
  Star,
  Check
} from "lucide-react";

// Available fields for export
const AVAILABLE_FIELDS = [
  { field: "date", label: "Datum", defaultLabel: "Utförtdatum" },
  { field: "address", label: "Adress", defaultLabel: "Hämtställe" },
  { field: "material", label: "Material", defaultLabel: "Material" },
  { field: "weightKg", label: "Vikt", defaultLabel: "Kvantitet" },
  { field: "unit", label: "Enhet", defaultLabel: "Enhet" },
  { field: "receiver", label: "Mottagare", defaultLabel: "Leveransställe" },
  { field: "isHazardous", label: "Farligt avfall", defaultLabel: "Farligt avfall" },
  { field: "handling", label: "Behandling", defaultLabel: "Behandling" },
  { field: "supplier", label: "Leverantör", defaultLabel: "Leverantör" },
  { field: "costSEK", label: "Kostnad", defaultLabel: "Kostnad (SEK)" },
  { field: "co2Saved", label: "CO2-besparing", defaultLabel: "CO2 (kg)" },
  { field: "wasteCode", label: "Avfallskod", defaultLabel: "Avfallskod" },
  { field: "filename", label: "Filnamn", defaultLabel: "Filnamn" },
];

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  order: number;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string | null;
  columns: ColumnConfig[];
  format: "xlsx" | "csv" | "json";
  include_headers: boolean;
  include_totals: boolean;
  is_default: boolean;
  is_system: boolean;
}

export default function ExportTemplatesPage() {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "xlsx" as "xlsx" | "csv" | "json",
    include_headers: true,
    include_totals: true,
    columns: AVAILABLE_FIELDS.map((f, i) => ({
      field: f.field,
      label: f.defaultLabel,
      visible: true,
      order: i + 1,
    })),
  });

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/export-templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      
      // Select default template if available
      const defaultTemplate = data.templates?.find((t: ExportTemplate) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "Ny mall",
      description: "",
      format: "xlsx",
      include_headers: true,
      include_totals: true,
      columns: AVAILABLE_FIELDS.map((f, i) => ({
        field: f.field,
        label: f.defaultLabel,
        visible: true,
        order: i + 1,
      })),
    });
    setShowForm(true);
  };

  const handleEdit = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      format: template.format,
      include_headers: template.include_headers,
      include_totals: template.include_totals,
      columns: template.columns,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = selectedTemplate ? "PUT" : "POST";
      const body = selectedTemplate 
        ? { id: selectedTemplate.id, ...formData }
        : formData;

      const res = await fetch("/api/export-templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna mall?")) return;

    try {
      await fetch(`/api/export-templates?id=${id}`, { method: "DELETE" });
      fetchTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch("/api/export-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_default: true }),
      });
      fetchTemplates();
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  const toggleColumnVisibility = (field: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map(c => 
        c.field === field ? { ...c, visible: !c.visible } : c
      ),
    }));
  };

  const updateColumnLabel = (field: string, label: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map(c => 
        c.field === field ? { ...c, label } : c
      ),
    }));
  };

  const moveColumn = (field: string, direction: "up" | "down") => {
    setFormData(prev => {
      const columns = [...prev.columns].sort((a, b) => a.order - b.order);
      const index = columns.findIndex(c => c.field === field);
      
      if (direction === "up" && index > 0) {
        [columns[index].order, columns[index - 1].order] = [columns[index - 1].order, columns[index].order];
      } else if (direction === "down" && index < columns.length - 1) {
        [columns[index].order, columns[index + 1].order] = [columns[index + 1].order, columns[index].order];
      }
      
      return { ...prev, columns };
    });
  };

  const formatIcons = {
    xlsx: FileSpreadsheet,
    csv: FileText,
    json: FileJson,
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
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
              <h1 className="text-2xl font-bold text-stone-900">Exportmallar</h1>
              <p className="text-stone-500 mt-1">
                Anpassa kolumner och format för dina exporter
              </p>
            </div>
            
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Ny mall
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100">
                <h2 className="font-medium text-stone-900">Mallar</h2>
              </div>
              
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-center text-stone-500">
                  Inga mallar ännu
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {templates.map((template) => {
                    const FormatIcon = formatIcons[template.format];
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleEdit(template)}
                        className={`w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors ${
                          selectedTemplate?.id === template.id ? "bg-indigo-50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FormatIcon className="w-4 h-4 text-stone-400" />
                            <span className="font-medium text-stone-900">{template.name}</span>
                            {template.is_default && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          {template.is_system && (
                            <span className="text-xs text-stone-400">System</span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-stone-500 mt-1">{template.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Template Editor */}
          <div className="col-span-2">
            {showForm ? (
              <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {selectedTemplate ? "Redigera mall" : "Ny mall"}
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedTemplate && !selectedTemplate.is_system && (
                      <>
                        {!selectedTemplate.is_default && (
                          <button
                            onClick={() => handleSetDefault(selectedTemplate.id)}
                            className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                          >
                            Sätt som standard
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(selectedTemplate.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Namn
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={selectedTemplate?.is_system}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-stone-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Format
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                      disabled={selectedTemplate?.is_system}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-stone-100"
                    >
                      <option value="xlsx">Excel (.xlsx)</option>
                      <option value="csv">CSV (.csv)</option>
                      <option value="json">JSON (.json)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Beskrivning
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={selectedTemplate?.is_system}
                    placeholder="Valfri beskrivning..."
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-stone-100"
                  />
                </div>

                {/* Options */}
                <div className="flex items-center gap-6 mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.include_headers}
                      onChange={(e) => setFormData(prev => ({ ...prev, include_headers: e.target.checked }))}
                      disabled={selectedTemplate?.is_system}
                    />
                    <span className="text-sm text-stone-700">Inkludera kolumnrubriker</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.include_totals}
                      onChange={(e) => setFormData(prev => ({ ...prev, include_totals: e.target.checked }))}
                      disabled={selectedTemplate?.is_system}
                    />
                    <span className="text-sm text-stone-700">Inkludera summeringsrad</span>
                  </label>
                </div>

                {/* Column configuration */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Kolumner
                  </label>
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Synlig</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Fält</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Rubrik</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase">Ordning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {[...formData.columns].sort((a, b) => a.order - b.order).map((col) => {
                          const fieldDef = AVAILABLE_FIELDS.find(f => f.field === col.field);
                          return (
                            <tr key={col.field} className={!col.visible ? "opacity-50" : ""}>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => toggleColumnVisibility(col.field)}
                                  disabled={selectedTemplate?.is_system}
                                  className="p-1 hover:bg-stone-100 rounded"
                                >
                                  {col.visible ? (
                                    <Eye className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-stone-400" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-2 text-sm text-stone-700">
                                {fieldDef?.label || col.field}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={col.label}
                                  onChange={(e) => updateColumnLabel(col.field, e.target.value)}
                                  disabled={selectedTemplate?.is_system}
                                  className="w-full px-2 py-1 text-sm border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-stone-100"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => moveColumn(col.field, "up")}
                                    disabled={selectedTemplate?.is_system}
                                    className="p-1 hover:bg-stone-100 rounded disabled:opacity-50"
                                  >
                                    <span className="text-xs">▲</span>
                                  </button>
                                  <button
                                    onClick={() => moveColumn(col.field, "down")}
                                    disabled={selectedTemplate?.is_system}
                                    className="p-1 hover:bg-stone-100 rounded disabled:opacity-50"
                                  >
                                    <span className="text-xs">▼</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save button */}
                {!selectedTemplate?.is_system && (
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving || !formData.name}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Spara
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-stone-600 hover:text-stone-900"
                    >
                      Avbryt
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
                <FileSpreadsheet className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900 mb-2">Välj eller skapa en mall</h3>
                <p className="text-stone-500 mb-4">
                  Klicka på en mall i listan eller skapa en ny för att anpassa exportformatet
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Skapa ny mall
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
