"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Bot, Key, AlertCircle, StopCircle } from "lucide-react";
import { BatchResultModal } from "./batch-result-modal";
import { ModelSelector, useConfiguredProviders } from "./model-selector";
import Link from "next/link";

interface BatchProcessButtonProps {
  uploadedDocs: any[];
  onSuccess?: () => void;
}

export function BatchProcessButton({ uploadedDocs, onSuccess }: BatchProcessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showResultModal, setShowResultModal] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);
  const abortRef = useRef(false);
  const processingDocsRef = useRef<string[]>([]);
  
  // Model selection state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash');
  const [customInstructions, setCustomInstructions] = useState('');
  const { providers: configuredProviders, loading: loadingProviders } = useConfiguredProviders();
  
  // Load user preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        if (data.success) {
          setSelectedModel(data.preferredModel || 'gemini-3-flash');
          setCustomInstructions(data.customInstructions || '');
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    }
    loadPreferences();
  }, []);
  
  const toggleDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };
  
  const selectAll = () => {
    setSelectedDocs(new Set(uploadedDocs.map(d => d.id)));
  };
  
  const deselectAll = () => {
    setSelectedDocs(new Set());
  };
  
  // Poll for document status until processing is complete
  const pollDocumentStatus = async (docId: string, maxAttempts = 90): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if cancelled
      if (abortRef.current) {
        return { id: docId, status: "cancelled", error: "Cancelled by user" };
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
      
      // Check again after waiting
      if (abortRef.current) {
        return { id: docId, status: "cancelled", error: "Cancelled by user" };
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
    
    // Timeout - return error status
    return { id: docId, status: "error", error: "Processing timeout" };
  };
  
  // Cancel batch processing
  const handleCancelBatch = async () => {
    setIsCancelling(true);
    abortRef.current = true;
    
    try {
      const response = await fetch("/api/cancel-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: processingDocsRef.current })
      });
      
      if (response.ok) {
        console.log("Batch processing cancelled");
      }
    } catch (error) {
      console.error("Cancel batch error:", error);
    } finally {
      setIsProcessing(false);
      setIsCancelling(false);
      setProcessedCount(0);
      abortRef.current = false;
      processingDocsRef.current = [];
    }
  };
  
  const processBatch = async () => {
    if (selectedDocs.size === 0) {
      alert("Välj minst ett dokument att granska");
      return;
    }
    
    setIsProcessing(true);
    setProcessedCount(0);
    abortRef.current = false;
    const documentIds = Array.from(selectedDocs);
    processingDocsRef.current = documentIds;
    
    try {
      // Start batch processing with model selection
      const response = await fetch("/api/process-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          documentIds,
          modelId: selectedModel,
          customInstructions: customInstructions || undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Batch processing failed");
      }
      
      // Poll all documents for completion
      const results: any[] = [];
      for (let i = 0; i < documentIds.length; i++) {
        // Check if cancelled
        if (abortRef.current) {
          console.log("Batch processing cancelled by user");
          return;
        }
        
        const docId = documentIds[i];
        const doc = await pollDocumentStatus(docId);
        results.push(doc);
        setProcessedCount(i + 1);
      }
      
      // Check if cancelled during processing
      if (abortRef.current) {
        return;
      }
      
      // Process results
      const documents = results.map(doc => {
        const extractedData = doc.extracted_data || {};
        const validation = extractedData._validation || {};
        
        return {
          documentId: doc.id,
          filename: doc.filename || "Okänt dokument",
          status: doc.status,
          confidence: validation.confidence || extractedData.metadata?.confidence,
          qualityScore: validation.qualityScore || validation.completeness,
          error: doc.status === "error" ? (doc.error || extractedData._error || "Bearbetning misslyckades") : undefined
        };
      });
      
      const approved = documents.filter(d => d.status === "approved").length;
      const needsReview = documents.filter(d => d.status === "needs_review").length;
      const failed = documents.filter(d => d.status === "error" || d.status === "cancelled").length;
      
      setBatchResults({
        total: documents.length,
        approved,
        needsReview,
        failed,
        documents
      });
      
      setShowResultModal(true);
      setIsProcessing(false);
      setProcessedCount(0);
      processingDocsRef.current = [];
      
    } catch (error) {
      console.error("Batch process error:", error);
      alert("Kunde inte starta batch-granskning. Försök igen.");
      setIsProcessing(false);
      setProcessedCount(0);
      processingDocsRef.current = [];
    }
  };
  
  if (uploadedDocs.length === 0) return null;
  
  return (
    <>
      {/* Loading Overlay with Cancel Button */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md mx-4">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Processar dokument</h3>
                <p className="text-sm text-gray-600">
                  {processedCount > 0 
                    ? `Behandlat ${processedCount} av ${selectedDocs.size} dokument...`
                    : `Startar behandling av ${selectedDocs.size} dokument...`
                  }
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(processedCount / selectedDocs.size) * 100}%` }}
              />
            </div>
            
            {/* Cancel Button */}
            <button
              onClick={handleCancelBatch}
              disabled={isCancelling}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-red-400"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Avbryter...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Avbryt bearbetning
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-blue-900">
            Batch-granskning
          </h3>
          <p className="text-sm text-blue-700">
            {uploadedDocs.length} uppladdade dokument väntar på granskning
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Välj alla
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Avmarkera alla
          </button>
        </div>
      </div>
      
      {/* Document checkboxes */}
      <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
        {uploadedDocs.map(doc => (
          <label 
            key={doc.id}
            className="flex items-center gap-3 p-2 hover:bg-blue-100 rounded cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedDocs.has(doc.id)}
              onChange={() => toggleDoc(doc.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {doc.filename}
              </div>
              <div className="text-xs text-gray-600">
                {new Date(doc.created_at).toLocaleString('sv-SE')}
              </div>
            </div>
          </label>
        ))}
      </div>
      
      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors mb-3"
      >
        <span className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Avancerade alternativ
        </span>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200 space-y-4">
          {/* API Key Warning */}
          {!loadingProviders && configuredProviders.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Inga API-nycklar konfigurerade</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Lägg till din API-nyckel för att använda AI-extrahering.
                </p>
                <Link
                  href="/settings/api-keys"
                  className="inline-flex items-center gap-1 text-xs text-yellow-800 hover:text-yellow-900 underline mt-2"
                >
                  <Key className="w-3 h-3" />
                  Lägg till API-nyckel
                </Link>
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI-modell
            </label>
            {loadingProviders ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Laddar modeller...
              </div>
            ) : (
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                configuredProviders={configuredProviders}
                showPricing={true}
                compact={true}
              />
            )}
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anpassade instruktioner (valfritt)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="T.ex. 'Ignorera rader med nollvikt' eller 'Materialet är alltid Brännbart om inte annat anges'"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Dessa instruktioner skickas till AI:n för att anpassa extraktionen.
            </p>
          </div>
        </div>
      )}

      {/* Process button */}
      <button
        onClick={processBatch}
        disabled={isProcessing || selectedDocs.size === 0 || (configuredProviders.length === 0 && !loadingProviders)}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isProcessing || selectedDocs.size === 0 || (configuredProviders.length === 0 && !loadingProviders)
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Behandlar {selectedDocs.size} dokument...
          </span>
        ) : configuredProviders.length === 0 && !loadingProviders ? (
          "Lägg till API-nyckel för att granska"
        ) : (
          `Granska ${selectedDocs.size > 0 ? selectedDocs.size : 'valda'} dokument`
        )}
      </button>
      </div>
      
      <BatchResultModal
        isOpen={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          if (onSuccess) onSuccess();
        }}
        results={batchResults}
      />
    </>
  );
}

