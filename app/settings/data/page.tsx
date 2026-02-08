"use client";

import { useState } from "react";
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileJson,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function DataPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExportData = async () => {
    setExportLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/export");
      
      if (!res.ok) {
        throw new Error("Export failed");
      }

      const data = await res.json();
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solvix-ai-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Data exporterad!" });
    } catch (err) {
      setMessage({ type: "error", text: "Export misslyckades. Försök igen." });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "RADERA") {
      setMessage({ type: "error", text: "Skriv RADERA för att bekräfta." });
      return;
    }

    setDeleteLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      // Redirect to login after deletion
      window.location.href = "/login?deleted=true";
    } catch (err) {
      setMessage({ type: "error", text: "Radering misslyckades. Kontakta support." });
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till inställningar
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dina data</h1>
        <p className="text-gray-600 mb-8">
          Hantera dina data enligt GDPR. Du har rätt att exportera eller radera
          dina uppgifter.
        </p>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <p
              className={
                message.type === "success" ? "text-green-800" : "text-red-800"
              }
            >
              {message.text}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Export data */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileJson className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Exportera data
                </h2>
                <p className="text-gray-600 mb-4">
                  Ladda ner en kopia av alla dina data i JSON-format. Detta
                  inkluderar kontoinformation, inställningar, dokument och
                  användningsstatistik.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {exportLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportLoading ? "Exporterar..." : "Exportera alla data"}
                </button>
              </div>
            </div>
          </div>

          {/* GDPR info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Dina rättigheter
                </h2>
                <p className="text-gray-600 mb-4">
                  Enligt GDPR har du rätt till:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>• Tillgång till dina data (dataportabilitet)</li>
                  <li>• Rättelse av felaktiga uppgifter</li>
                  <li>• Radering av dina data ("rätten att bli glömd")</li>
                  <li>• Begränsning av databehandling</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Läs mer i vår{" "}
                  <Link href="/privacy" className="text-indigo-600 hover:underline">
                    integritetspolicy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Delete account */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                  Radera konto
                </h2>
                <p className="text-gray-600 mb-4">
                  Om du raderar ditt konto kommer all din data att tas bort
                  permanent. Detta inkluderar:
                </p>
                <ul className="text-gray-600 space-y-1 mb-4">
                  <li>• Kontoinformation och inställningar</li>
                  <li>• Alla dokument och extraherad data</li>
                  <li>• API-nycklar och Azure-anslutningar</li>
                  <li>• Användningshistorik</li>
                </ul>
                <p className="text-red-600 font-medium mb-4">
                  ⚠️ Denna åtgärd kan inte ångras!
                </p>

                {!showDeleteModal ? (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Radera mitt konto
                  </button>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 mb-4">
                      Skriv <strong>RADERA</strong> för att bekräfta:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="RADERA"
                      className="w-full px-3 py-2 border border-red-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeleteConfirm("");
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || deleteConfirm !== "RADERA"}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Radera permanent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
