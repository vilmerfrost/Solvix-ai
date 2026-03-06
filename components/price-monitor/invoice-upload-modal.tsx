"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, FileSearch } from "lucide-react";
import { Button, useToast } from "@/components/ui/index";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { processInvoice, formatSEK } from "@/lib/price-monitor-api";

interface InvoiceUploadModalProps {
  onClose: () => void;
  onProcessed: () => void;
  session: { access_token: string; user: { id: string } };
}

type Step = "idle" | "uploading" | "processing" | "done" | "error";

interface ProcessResult {
  supplier: string;
  line_items_count: number;
  alerts_count: number;
  alerts: Array<{
    product_id: string;
    previous_price: number;
    new_price: number;
    change_percent: number;
  }>;
}

export function InvoiceUploadModal({
  onClose,
  onProcessed,
  session,
}: InvoiceUploadModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Endast PDF-filer stöds för tillfället.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMsg("Filen är för stor (max 50 MB).");
      return;
    }
    setErrorMsg("");
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Kunde inte ansluta till Supabase.");
      return;
    }

    setStep("uploading");
    setErrorMsg("");

    try {
      // 1. Upload to Supabase Storage
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const storagePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw new Error(`Uppladdning misslyckades: ${uploadError.message}`);

      // 2. Create document record
      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: session.user.id,
          filename: file.name,
          status: "queued",
          storage_path: storagePath,
          document_domain: "invoice",
        })
        .select("id")
        .single();

      if (dbError || !doc) throw new Error(`Databasfel: ${dbError?.message}`);

      setDocumentId(doc.id);

      // 3. Process invoice
      setStep("processing");
      const res = await processInvoice(doc.id, session);

      if (!res.success) throw new Error("Bearbetning misslyckades.");

      setResult(res);
      setStep("done");
      onProcessed();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Något gick fel.");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
            Ladda upp faktura
          </h2>
          <button
            onClick={onClose}
            style={{ color: "var(--color-text-muted)" }}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === "idle" || step === "error" ? (
            <>
              {/* Drop zone */}
              <div
                className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-colors ${
                  dragging ? "border-accent" : ""
                }`}
                style={{
                  borderColor: dragging
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                  background: dragging
                    ? "var(--color-accent-muted)"
                    : "var(--color-bg-secondary)",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
              >
                <Upload
                  className="w-10 h-10"
                  style={{ color: "var(--color-accent)" }}
                />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Dra och släpp en PDF här
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                    eller klicka för att välja fil (max 50 MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {/* Selected file */}
              {file && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <FileText className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                  <p className="text-sm truncate flex-1" style={{ color: "var(--color-text-primary)" }}>
                    {file.name}
                  </p>
                  <button onClick={() => setFile(null)} style={{ color: "var(--color-text-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {errorMsg && (
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--color-error)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </p>
              )}
            </>
          ) : step === "uploading" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2
                className="w-10 h-10 animate-spin"
                style={{ color: "var(--color-accent)" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Laddar upp faktura…
              </p>
            </div>
          ) : step === "processing" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2
                className="w-10 h-10 animate-spin"
                style={{ color: "var(--color-accent)" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Analyserar faktura och matchar priser…
              </p>
            </div>
          ) : step === "done" && result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6" style={{ color: "var(--color-success)" }} />
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                  Faktura bearbetad
                </p>
              </div>
              <div
                className="rounded-lg border p-4 space-y-2 text-sm"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <p>Leverantör: <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{result.supplier}</span></p>
                <p>Radposter hittade: <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{result.line_items_count}</span></p>
                <p>
                  Prisvarningar genererade:{" "}
                  <span
                    className="font-medium"
                    style={{ color: result.alerts_count > 0 ? "var(--color-error)" : "var(--color-success)" }}
                  >
                    {result.alerts_count}
                  </span>
                </p>
              </div>
              {result.alerts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Prisförändringar
                  </p>
                  {result.alerts.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                      style={{ background: "#fef2f2" }}
                    >
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {formatSEK(a.previous_price)} → {formatSEK(a.new_price)}
                      </span>
                      <span className="font-semibold" style={{ color: "#ef4444" }}>
                        +{a.change_percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          {step === "done" ? (
            <>
              {documentId && (
                <Button
                  variant="secondary"
                  icon={<FileSearch className="w-4 h-4" />}
                  onClick={() => {
                    onClose();
                    router.push(`/price-monitor/review/${documentId}`);
                  }}
                >
                  Granska
                </Button>
              )}
              <Button variant="primary" onClick={onClose}>
                Stäng
              </Button>
            </>
          ) : step === "uploading" || step === "processing" ? null : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Avbryt
              </Button>
              <Button
                variant="primary"
                disabled={!file}
                onClick={handleUpload}
                icon={<Upload className="w-4 h-4" />}
              >
                Ladda upp & analysera
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
