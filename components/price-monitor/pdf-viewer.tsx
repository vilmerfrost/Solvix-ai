"use client";

import { useState } from "react";
import { Download, AlertCircle, FileText } from "lucide-react";

interface PdfViewerProps {
  url: string | null;
  filename?: string | null;
}

export function PdfViewer({ url, filename }: PdfViewerProps) {
  const [failed, setFailed] = useState(false);

  if (!url) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 p-8"
        style={{ background: "var(--color-bg-secondary)" }}
      >
        <FileText className="w-12 h-12" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          PDF ej tillgänglig
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4 p-8"
        style={{ background: "var(--color-bg-secondary)" }}
      >
        <AlertCircle className="w-10 h-10" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Förhandsgranskning ej tillgänglig
        </p>
        <a
          href={url}
          download={filename ?? "faktura.pdf"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--color-accent)",
            color: "white",
          }}
        >
          <Download className="w-4 h-4" />
          Ladda ner PDF
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ background: "#f1f5f9" }}>
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Originalfaktura"
        onError={() => setFailed(true)}
        // Some browsers block iframe for blob URLs — fallback handled above
      />
      {/* Download overlay in corner */}
      <a
        href={url}
        download={filename ?? "faktura.pdf"}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md transition-opacity hover:opacity-90"
        style={{
          background: "var(--color-bg-elevated)",
          color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Download className="w-3.5 h-3.5" />
        Ladda ner
      </a>
    </div>
  );
}
