"use client";

import { AlertTriangle, Check, X, ArrowRight } from "lucide-react";

export interface VerificationIssue {
  itemIndex: number;
  field: string;
  issue: string;
  severity: "warning" | "error";
  suggestion?: string;
  currentValue: any;
}

interface VerificationIssuesProps {
  issues: VerificationIssue[];
  onDismiss?: (index: number) => void;
  onAccept?: (index: number) => void;
}

export function VerificationIssues({ issues, onDismiss, onAccept }: VerificationIssuesProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
        Verifieringsvarningar ({issues.length})
      </h3>
      
      <div className="space-y-2">
        {issues.map((issue, idx) => (
          <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                  Rad {issue.itemIndex + 1} • {issue.field}
                </span>
                <p className="text-sm text-yellow-900 mt-1">
                  {issue.issue}
                </p>
              </div>
            </div>

            {issue.suggestion && (
              <div className="mt-2 p-2 bg-white/60 rounded border border-yellow-100 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Föreslagen ändring:</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-red-400 decoration-red-400/50">
                      {String(issue.currentValue)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-green-600 bg-green-50 px-1 rounded">
                      {issue.suggestion}
                    </span>
                  </div>
                </div>
                {onAccept && (
                  <button 
                    onClick={() => onAccept(idx)}
                    className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    title="Godkänn ändring"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {onDismiss && (
                  <button 
                    onClick={() => onDismiss(idx)}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    title="Ignorera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
