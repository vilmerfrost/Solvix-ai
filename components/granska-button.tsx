"use client";

import { useState, useRef } from "react";
import { ProcessingResultModal } from "./processing-result-modal";
import { Loader2, StopCircle } from "lucide-react";

interface GranskaButtonProps {
  documentId: string;
  filename?: string;
  onSuccess?: () => void;
}

export function GranskaButton({ documentId, filename, onSuccess }: GranskaButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<any>(null);
  const abortRef = useRef(false);
  
  // Poll for document status until processing is complete
  const pollDocumentStatus = async (docId: string, maxAttempts = 60): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if cancelled
      if (abortRef.current) {
        throw new Error("cancelled");
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
      
      // Check again after waiting
      if (abortRef.current) {
        throw new Error("cancelled");
      }
      
      try {
        const response = await fetch(`/api/document-status?id=${docId}`);
        if (!response.ok) continue;
        
        const data = await response.json();
        const doc = data.document;
        
        // If no longer processing, return the result
        if (doc.status !== "processing") {
          return doc;
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }
    
    // Timeout - return error
    throw new Error("Processing timeout");
  };
  
  const handleCancel = async () => {
    setIsCancelling(true);
    abortRef.current = true;
    
    try {
      const response = await fetch("/api/cancel-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      
      if (response.ok) {
        console.log("Processing cancelled successfully");
      }
    } catch (error) {
      console.error("Cancel error:", error);
    } finally {
      setIsProcessing(false);
      setIsCancelling(false);
      abortRef.current = false;
    }
  };
  
  const handleGranska = async () => {
    setIsProcessing(true);
    abortRef.current = false;
    
    try {
      // Start processing
      const response = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Processing failed");
      }
      
      // Poll for results
      const doc = await pollDocumentStatus(documentId);
      
      // Extract result data
      const extractedData = doc.extracted_data || {};
      const validation = extractedData._validation || {};
      
      const resultData = {
        documentId: doc.id,
        filename: doc.filename || filename || "Okänt dokument",
        status: doc.status,
        confidence: validation.confidence || extractedData.metadata?.confidence,
        qualityScore: validation.qualityScore || validation.completeness,
        extractedRows: extractedData.metadata?.processedRows || extractedData.metadata?.aggregatedRows || extractedData.lineItems?.length || 0,
        totalWeight: extractedData.totalWeightKg || 0,
        error: doc.status === "error" ? (extractedData._error || "Bearbetning misslyckades") : undefined,
        errorType: extractedData._errorType,
        suggestions: extractedData._suggestions
      };
      
      setResult(resultData);
      setShowResultModal(true);
      setIsProcessing(false);
      
    } catch (error) {
      // Don't show error modal if cancelled
      if ((error instanceof Error ? error.message : String(error)) === "cancelled") {
        console.log("Processing was cancelled by user");
        return;
      }
      
      console.error("Granska error:", error);
      
      // Show error result
      setResult({
        documentId,
        filename: filename || "Okänt dokument",
        status: "error",
        error: (error instanceof Error ? error.message : String(error)) || "Kunde inte starta granskning. Försök igen."
      });
      setShowResultModal(true);
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleGranska}
          disabled={isProcessing}
          className={`flex-1 w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all text-center border ${
            isProcessing
              ? "bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-white border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:shadow-sm"
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Behandlar...
            </span>
          ) : (
            "Granska"
          )}
        </button>
        
        {/* Stop/Cancel Button - only visible during processing */}
        {isProcessing && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 shadow-sm"
            title="Avbryt bearbetning"
          >
            {isCancelling ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <StopCircle className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      
      <ProcessingResultModal
        isOpen={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          if (onSuccess) onSuccess();
        }}
        result={result}
      />
    </>
  );
}

