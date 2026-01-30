"use client";

import { useState, useEffect } from "react";
import { Loader2, X, StopCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface ProcessingSession {
  id: string;
  status: "active" | "completed" | "cancelled";
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  model_id?: string;
  started_at: string;
}

interface ProcessingStatusProps {
  onStopped?: () => void;
}

export function ProcessingStatus({ onStopped }: ProcessingStatusProps) {
  const [session, setSession] = useState<ProcessingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Poll for active session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/processing-session");
        const data = await res.json();
        
        if (data.success && data.session) {
          setSession(data.session);
          
          // Check if completed
          if (data.session.status === "completed") {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleStop = async () => {
    if (!session || stopping) return;

    setStopping(true);
    try {
      const res = await fetch("/api/processing-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId: session.id }),
      });

      const data = await res.json();

      if (data.success) {
        setShowSuccess(data.message);
        setSession(null);
        onStopped?.();
        
        // Clear success message after 5 seconds
        setTimeout(() => setShowSuccess(null), 5000);
      }
    } catch (err) {
      console.error("Error stopping session:", err);
    } finally {
      setStopping(false);
    }
  };

  // Don't render if no session and no success message
  if (!session && !showSuccess) return null;

  // Success message after stopping
  if (showSuccess) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-white rounded-xl shadow-2xl border border-green-200 p-4 w-80">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">{showSuccess}</p>
            </div>
            <button
              onClick={() => setShowSuccess(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = session
    ? Math.round((session.processed_documents / session.total_documents) * 100)
    : 0;

  // Minimized view
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-all animate-pulse"
      >
        <div className="relative">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="absolute -top-2 -right-2 bg-white text-indigo-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {progress}%
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-80">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Bearbetar dokument</span>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {session?.processed_documents || 0} / {session?.total_documents || 0}
              </span>
              <span className="font-semibold text-indigo-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status details */}
          {session?.failed_documents > 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>{session.failed_documents} fel</span>
            </div>
          )}

          {/* Model info */}
          {session?.model_id && (
            <p className="text-xs text-gray-500 mb-3">
              Modell: {session.model_id}
            </p>
          )}

          {/* Stop button */}
          <button
            onClick={handleStop}
            disabled={stopping}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {stopping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Stoppar...
              </>
            ) : (
              <>
                <StopCircle className="w-4 h-4" />
                Stoppa extraktion
              </>
            )}
          </button>

          {/* Info text */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Dokument som inte bearbetats återställs
          </p>
        </div>
      </div>
    </div>
  );
}
