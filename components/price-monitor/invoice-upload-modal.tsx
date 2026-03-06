"use client";

import { InvoiceUploadFlow } from "@/components/price-monitor/invoice-upload-flow";

interface InvoiceUploadModalProps {
  onClose: () => void;
  onProcessed: () => void;
  session: { access_token: string; user: { id: string } };
}

export function InvoiceUploadModal({
  onClose,
  onProcessed,
}: InvoiceUploadModalProps) {
  return <InvoiceUploadFlow onClose={onClose} onProcessed={onProcessed} />;
}
