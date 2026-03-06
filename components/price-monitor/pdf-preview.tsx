"use client";

interface PdfPreviewProps {
  url: string | null;
}

export function PdfPreview({ url }: PdfPreviewProps) {
  if (!url) {
    return (
      <div
        className="flex h-[500px] items-center justify-center rounded-lg border text-sm"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        Förhandsgranskning saknas
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="h-[500px] w-full rounded-lg border"
      style={{ borderColor: "var(--color-border)" }}
      title="PDF-förhandsgranskning"
    />
  );
}
