"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  Brain, 
  FileSearch, 
  Scale, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types based on the description
interface ExtractionStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  durationMs?: number;
  model?: string;
  details?: Record<string, any>;
  timestamp: string;
}

interface ExtractionRun {
  id: string;
  documentId: string;
  status: "processing" | "completed" | "failed";
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  cost?: number;
  steps: ExtractionStep[];
  modelPath: string[]; // e.g. ["gemini-flash", "haiku-verification"]
}

interface ExtractionRunViewerProps {
  runId: string;
  className?: string;
}

export function ExtractionRunViewer({ runId, className }: ExtractionRunViewerProps) {
  const [run, setRun] = useState<ExtractionRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Mock data fetch for now - in real app this hits an API
  useEffect(() => {
    // Simulate API call
    const fetchRun = async () => {
      setLoading(true);
      try {
        // Replace with actual fetch: const res = await fetch(`/api/extraction-runs/${runId}`);
        // For now, mock it to show the UI
        await new Promise(r => setTimeout(r, 1000));
        
        const mockRun: ExtractionRun = {
          id: runId,
          documentId: "doc_123",
          status: "completed",
          startTime: new Date(Date.now() - 10000).toISOString(),
          endTime: new Date().toISOString(),
          totalDurationMs: 8500,
          cost: 0.0042,
          modelPath: ["gemini-2.0-flash", "claude-3-haiku"],
          steps: [
            {
              id: "step_1",
              name: "Quality Assessment",
              status: "completed",
              durationMs: 1200,
              model: "gemini-2.0-flash",
              timestamp: new Date(Date.now() - 9000).toISOString(),
              details: {
                confidence: 0.98,
                routing: "Standard Pipeline",
                documentType: "Invoice"
              }
            },
            {
              id: "step_2",
              name: "Extraction",
              status: "completed",
              durationMs: 4500,
              model: "gemini-2.0-flash",
              timestamp: new Date(Date.now() - 7800).toISOString(),
              details: {
                itemsFound: 12,
                fieldsExtracted: 24,
                averageConfidence: 0.92
              }
            },
            {
              id: "step_3",
              name: "Verification",
              status: "completed",
              durationMs: 2100,
              model: "claude-3-haiku",
              timestamp: new Date(Date.now() - 3000).toISOString(),
              details: {
                issuesFound: 0,
                flaggedItems: [],
                verificationScore: 1.0
              }
            },
            {
              id: "step_4",
              name: "Reconciliation",
              status: "skipped",
              timestamp: new Date(Date.now() - 500).toISOString(),
              details: {
                reason: "High confidence in verification"
              }
            }
          ]
        };
        setRun(mockRun);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (runId) fetchRun();
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
        <span className="text-sm text-gray-600">Laddar extraheringshistorik...</span>
      </div>
    );
  }

  if (!run) return null;

  const getStepIcon = (name: string) => {
    switch (name) {
      case "Quality Assessment": return <FileSearch className="w-4 h-4" />;
      case "Extraction": return <Brain className="w-4 h-4" />;
      case "Verification": return <ShieldCheck className="w-4 h-4" />;
      case "Reconciliation": return <Scale className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50 border-green-200";
      case "failed": return "text-red-600 bg-red-50 border-red-200";
      case "processing": return "text-blue-600 bg-blue-50 border-blue-200";
      case "skipped": return "text-gray-400 bg-gray-50 border-gray-200";
      default: return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total tid</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono font-medium">{(run.totalDurationMs || 0) / 1000}s</span>
          </div>
        </div>
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Modellväg</p>
          <div className="flex items-center gap-1 text-xs font-medium overflow-hidden whitespace-nowrap">
            {(Array.isArray(run.modelPath) ? run.modelPath : []).map((m, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ArrowRight className="w-3 h-3 mx-1 text-gray-400" />}
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">{m}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
            run.status === 'completed' ? "bg-green-100 text-green-700" : 
            run.status === 'failed' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          )}>
            {run.status}
          </span>
        </div>
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Est. Kostnad</p>
          <span className="font-mono font-medium text-gray-700">${run.cost?.toFixed(4)}</span>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200" />
        
        <div className="space-y-4">
          {(Array.isArray(run.steps) ? run.steps : []).map((step, index) => {
            const isExpanded = expandedStep === step.id;
            const isCompleted = step.status === "completed";
            const isSkipped = step.status === "skipped";
            
            return (
              <div key={step.id} className="relative pl-14">
                {/* Connector Line Dot */}
                <div className={cn(
                  "absolute left-4 top-4 w-4 h-4 rounded-full border-2 z-10 bg-white flex items-center justify-center transform -translate-x-1/2",
                  isCompleted ? "border-green-500 text-green-500" :
                  step.status === "failed" ? "border-red-500 text-red-500" :
                  isSkipped ? "border-gray-300 text-gray-300" : "border-blue-500 text-blue-500"
                )}>
                  {isCompleted && <div className="w-2 h-2 rounded-full bg-green-500" />}
                  {step.status === "processing" && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                </div>

                {/* Card */}
                <div 
                  className={cn(
                    "border rounded-lg transition-all duration-200 bg-white hover:shadow-sm",
                    isExpanded ? "ring-2 ring-blue-500 border-transparent" : "border-gray-200",
                    isSkipped && "opacity-60 bg-gray-50"
                  )}
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="w-full flex items-center justify-between p-4"
                    disabled={isSkipped}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        getStatusColor(step.status)
                      )}>
                        {getStepIcon(step.name)}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {step.model && <span>{step.model}</span>}
                          {step.durationMs && <span>• {(step.durationMs / 1000).toFixed(2)}s</span>}
                        </div>
                      </div>
                    </div>
                    
                    {!isSkipped && (
                      <div className="flex items-center gap-2">
                         {step.status === "completed" && (
                           <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                             Klar
                           </span>
                         )}
                         {isExpanded ? (
                           <ChevronUp className="w-4 h-4 text-gray-400" />
                         ) : (
                           <ChevronDown className="w-4 h-4 text-gray-400" />
                         )}
                      </div>
                    )}
                    {isSkipped && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Hoppades över
                      </span>
                    )}
                  </button>

                  {isExpanded && step.details && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-2">
                      <div className="pt-4 grid grid-cols-2 gap-4">
                        {Object.entries(step.details).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm font-medium text-gray-900 font-mono">
                              {typeof value === 'number' && key.includes('confidence') 
                                ? `${(value * 100).toFixed(1)}%`
                                : String(value)
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
