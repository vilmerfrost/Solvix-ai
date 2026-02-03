"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown, ChevronUp, Bot, Key, AlertCircle, StopCircle, FileText, FileSpreadsheet, Settings2 } from "lucide-react";
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
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'excel'>('all');
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
  
  const filteredDocs = uploadedDocs.filter(doc => {
    if (fileTypeFilter === 'all') return true;
    const isExcel = doc.filename.toLowerCase().endsWith('.xlsx') || doc.filename.toLowerCase().endsWith('.xls');
    if (fileTypeFilter === 'excel') return isExcel;
    return !isExcel; // Default to PDF/Image for non-Excel
  });

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
    setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
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
      
      <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-6 overflow-hidden">
      {/* Header & Filters */}
      <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-stone-900 flex items-center gap-2">
            Batch-granskning
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-normal border border-stone-200">
              {uploadedDocs.length}
            </span>
          </h3>
          <p className="text-sm text-stone-500 mt-0.5">
            Välj dokument att bearbeta med AI
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* File Type Filter */}
          <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
             <button 
               onClick={() => setFileTypeFilter('all')}
               className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                 fileTypeFilter === 'all' 
                   ? 'bg-stone-900 text-white shadow-sm' 
                   : 'text-stone-600 hover:bg-stone-50'
               }`}
             >
               Alla
             </button>
             <button 
               onClick={() => setFileTypeFilter('pdf')}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                 fileTypeFilter === 'pdf' 
                   ? 'bg-stone-900 text-white shadow-sm' 
                   : 'text-stone-600 hover:bg-stone-50'
               }`}
               title="Visa endast PDF"
             >
               <FileText className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">PDF</span>
             </button>
             <button 
               onClick={() => setFileTypeFilter('excel')}
               className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                 fileTypeFilter === 'excel' 
                   ? 'bg-stone-900 text-white shadow-sm' 
                   : 'text-stone-600 hover:bg-stone-50'
               }`}
               title="Visa endast Excel"
             >
               <FileSpreadsheet className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Excel</span>
             </button>
          </div>

          <div className="h-8 w-px bg-stone-200 mx-1" />

          <div className="flex gap-1">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Välj alla
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Rensa
            </button>
          </div>
        </div>
      </div>
      
      {/* Document checkboxes */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-1 bg-stone-50/30">
        {filteredDocs.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-sm">
            Inga dokument matchar filtret.
          </div>
        ) : (
          filteredDocs.map(doc => {
            const isExcel = doc.filename.toLowerCase().endsWith('.xlsx') || doc.filename.toLowerCase().endsWith('.xls');
            return (
              <label 
                key={doc.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
                  ${selectedDocs.has(doc.id) 
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                    : 'bg-white border-transparent hover:border-stone-200 hover:shadow-sm'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedDocs.has(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 border-gray-300"
                />
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                  ${isExcel ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
                `}>
                  {isExcel ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {doc.filename}
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-2">
                    <span>{new Date(doc.created_at).toLocaleString('sv-SE')}</span>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
      
      {/* Footer / Actions */}
      <div className="p-4 border-t border-stone-200 bg-white">
        {/* Advanced Options Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all border
              ${showAdvanced 
                ? 'bg-stone-50 border-stone-200 text-stone-900 shadow-inner' 
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:shadow-sm'
              }
            `}
          >
            <span className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-md ${showAdvanced ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500'}`}>
                <Settings2 className="w-4 h-4" />
              </div>
              Avancerade inställningar
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {/* Advanced Options Panel */}
          <div className={`
            grid transition-all duration-300 ease-in-out
            ${showAdvanced ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}
          `}>
            <div className="overflow-hidden">
              <div className="p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-5">
                {/* API Key Warning */}
                {!loadingProviders && configuredProviders.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Inga API-nycklar konfigurerade</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Lägg till din API-nyckel för att använda AI-extrahering.
                      </p>
                      <Link
                        href="/settings/api-keys"
                        className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 underline mt-2 font-medium"
                      >
                        <Key className="w-3 h-3" />
                        Lägg till API-nyckel
                      </Link>
                    </div>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Välj AI-modell
                  </label>
                  {loadingProviders ? (
                    <div className="flex items-center gap-2 text-sm text-stone-500 p-3 bg-white rounded-lg border border-stone-200">
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
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Instruktioner till AI
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="T.ex. 'Ignorera rader med nollvikt' eller 'Materialet är alltid Brännbart om inte annat anges'"
                    className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none shadow-sm placeholder:text-stone-400"
                    rows={3}
                  />
                  <p className="text-xs text-stone-500 mt-2 flex items-center gap-1.5">
                    <Bot className="w-3 h-3" />
                    Skickas med prompten för att styra extraktionen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Process button */}
        <button
          onClick={processBatch}
          disabled={isProcessing || selectedDocs.size === 0 || (configuredProviders.length === 0 && !loadingProviders)}
          className={`w-full px-4 py-3.5 rounded-xl font-medium shadow-sm transition-all transform active:scale-[0.99] ${
            isProcessing || selectedDocs.size === 0 || (configuredProviders.length === 0 && !loadingProviders)
              ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
              : "bg-stone-900 hover:bg-black text-white hover:shadow-md"
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
            <span className="flex items-center justify-center gap-2">
               <Bot className="w-5 h-5" />
               Starta granskning av {selectedDocs.size > 0 ? selectedDocs.size : 'valda'} dokument
            </span>
          )}
        </button>
      </div>
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

