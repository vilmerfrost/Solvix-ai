"use client";

import { useEffect } from "react";
import { CheckCircle, AlertTriangle, X, FileText, TrendingUp, Scale, List, Key, RefreshCw, Zap, HelpCircle, Clock, Server, Hourglass, FileWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProcessingResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    documentId: string;
    filename: string;
    status: "approved" | "needs_review" | "error";
    confidence?: number;
    qualityScore?: number;
    extractedRows?: number;
    totalWeight?: number;
    error?: string;
    errorType?: string;
    suggestions?: string[];
  } | null;
}

export function ProcessingResultModal({ isOpen, onClose, result }: ProcessingResultModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const isApproved = result.status === "approved";
  const isError = result.status === "error";
  const needsReview = result.status === "needs_review";

  const handleReview = () => {
    onClose();
    router.push(`/review/${result.documentId}`);
  };

  const handleClose = () => {
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-6 border-b ${
          isApproved ? "bg-green-50 border-green-200" :
          isError ? "bg-red-50 border-red-200" :
          "bg-yellow-50 border-yellow-200"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isApproved && <CheckCircle className="w-6 h-6 text-green-600" />}
              {needsReview && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
              {isError && <AlertTriangle className="w-6 h-6 text-red-600" />}
              <div>
                <h2 className={`text-xl font-bold ${
                  isApproved ? "text-green-900" :
                  isError ? "text-red-900" :
                  "text-yellow-900"
                }`}>
                  {isApproved && "Godkänt automatiskt!"}
                  {needsReview && "Behöver granskning"}
                  {isError && "Bearbetning misslyckades"}
                </h2>
                <p className="text-sm text-gray-600 mt-1 truncate max-w-xs">
                  {result.filename}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          <div className="mb-6">
            {isApproved && (
              <p className="text-gray-700 leading-relaxed">
                AI:n granskade detta dokument med hög tillförlitlighet och skickade det
                direkt till Azure på grund av det höga kvalitetsbetyget.
              </p>
            )}
            {needsReview && (
              <p className="text-gray-700 leading-relaxed">
                Dokumentet behöver mänsklig granskning. AI:n hittade data men är inte
                tillräckligt säker för automatiskt godkännande.
              </p>
            )}
            {isError && (
              <div className="space-y-4">
                <p className="text-red-700 leading-relaxed font-medium">
                  {result.error || "Ett fel uppstod vid bearbetning av dokumentet."}
                </p>
                
                {/* Error Type Badge */}
                {result.errorType && (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      result.errorType === 'api_key' ? 'bg-orange-100 text-orange-800' :
                      result.errorType === 'rate_limit' ? 'bg-yellow-100 text-yellow-800' :
                      result.errorType === 'server_error' ? 'bg-red-100 text-red-800' :
                      result.errorType === 'timeout' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {result.errorType === 'api_key' && <><Key className="w-3 h-3" /> API-nyckel</>}
                      {result.errorType === 'rate_limit' && <><Clock className="w-3 h-3" /> Rate limit</>}
                      {result.errorType === 'server_error' && <><Server className="w-3 h-3" /> Server-fel</>}
                      {result.errorType === 'timeout' && <><Hourglass className="w-3 h-3" /> Timeout</>}
                      {result.errorType === 'invalid_response' && <><FileWarning className="w-3 h-3" /> Ogiltigt svar</>}
                      {!['api_key', 'rate_limit', 'server_error', 'timeout', 'invalid_response'].includes(result.errorType || '') && <><HelpCircle className="w-3 h-3" /> Okänt fel</>}
                    </span>
                  </div>
                )}
                
                {/* Suggestions Box */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Förslag</span>
                    </div>
                    <ul className="space-y-2">
                      {result.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                          <span className="text-blue-500">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Quick Actions for Error */}
                <div className="flex flex-wrap gap-2">
                  {result.errorType === 'api_key' && (
                    <Link
                      href="/settings/api-keys"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-sm transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Hantera API-nycklar
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleClose();
                      // Trigger retry
                      window.location.reload();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Försök igen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          {(isApproved || needsReview) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Quality Score */}
              {result.qualityScore !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Kvalitet</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.qualityScore.toFixed(1)}%
                  </p>
                </div>
              )}

              {/* Confidence */}
              {result.confidence !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Tillförl.</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {/* Confidence is stored as 0-100 percentage */}
                    {Math.round(result.confidence).toFixed(0)}%
                  </p>
                </div>
              )}

              {/* Extracted Rows */}
              {result.extractedRows !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <List className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Rader</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.extractedRows}
                  </p>
                </div>
              )}

              {/* Total Weight */}
              {result.totalWeight !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-600 uppercase">Vikt</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {(result.totalWeight / 1000).toFixed(2)} ton
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status Badge (for needs_review) */}
          {needsReview && (
            <div className="mb-6">
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-700" />
                  <div>
                    <p className="font-semibold text-yellow-900">Status</p>
                    <p className="text-sm text-yellow-700">Behöver granskning</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t flex gap-3 ${
          isApproved ? "bg-green-50 border-green-200" :
          isError ? "bg-red-50 border-red-200" :
          "bg-yellow-50 border-yellow-200"
        }`}>
          {isApproved && (
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              OK
            </button>
          )}
          
          {needsReview && (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Stäng
              </button>
              <button
                onClick={handleReview}
                className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
              >
                Granska nu
              </button>
            </>
          )}
          
          {isError && (
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Stäng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
