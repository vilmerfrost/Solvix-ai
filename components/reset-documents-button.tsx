"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export function ResetDocumentsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReset = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch("/api/documents/reset", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Raderade ${result.deleted} dokument. Du kan nu hämta nya filer från Azure.` 
        });
        // Reload after 2 seconds to show clean dashboard
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Kunde inte rensa dokument' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Ett fel uppstod vid rensning' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Rensa alla dokument och börja om"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        <span>{isLoading ? 'Rensar...' : 'Rensa gränssnitt'}</span>
      </button>

      {/* Toast Message */}
      {message && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Rensa gränssnitt?
                  </h3>
                  <div className="text-sm text-gray-600 space-y-3">
                    <p>
                      Du är på väg att <strong>rensa alla dokument</strong> från gränssnittet.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-800 mb-1">Vad händer:</p>
                      <ul className="text-blue-700 space-y-1 text-xs">
                        <li>• Alla dokument tas bort från dashboarden</li>
                        <li>• Din progress (granskningar, godkännanden) raderas</li>
                        <li>• <strong>Filerna i Azure påverkas INTE</strong></li>
                      </ul>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="font-medium text-green-800 mb-1">Efter rensning:</p>
                      <ul className="text-green-700 space-y-1 text-xs">
                        <li>• Klicka &quot;Synka från Azure&quot; för att hämta filer igen</li>
                        <li>• Börja om med en ren slate</li>
                        <li>• Perfekt för att starta nytt eller felsöka</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Ja, rensa allt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
