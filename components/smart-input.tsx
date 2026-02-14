import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { SmartFieldValue } from "@/lib/schemas";

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  fieldData: SmartFieldValue<string | number | null>;
  description?: string;
  showConfidenceBar?: boolean;
}

// Confidence level configuration - professional, muted colors
const confidenceConfig = {
  high: {
    border: "border-l-emerald-400",
    bg: "bg-emerald-50/30",
    ring: "focus:ring-emerald-200 focus:border-emerald-400",
    badge: "text-emerald-700 bg-emerald-50 ring-emerald-200/50",
    label: "Hög säkerhet",
  },
  medium: {
    border: "border-l-amber-400",
    bg: "bg-amber-50/30",
    ring: "focus:ring-amber-200 focus:border-amber-400",
    badge: "text-amber-700 bg-amber-50 ring-amber-200/50",
    label: "Kontrollera",
  },
  low: {
    border: "border-l-rose-400",
    bg: "bg-rose-50/30",
    ring: "focus:ring-rose-200 focus:border-rose-400",
    badge: "text-rose-700 bg-rose-50 ring-rose-200/50",
    label: "Osäker",
  },
  none: {
    border: "border-l-stone-200",
    bg: "bg-white",
    ring: "focus:ring-indigo-200 focus:border-indigo-400",
    badge: "",
    label: "",
  },
};

function getConfidenceLevel(confidence: number): keyof typeof confidenceConfig {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.6) return "medium";
  if (confidence > 0) return "low";
  return "none";
}

export function SmartInput({ 
  label, 
  fieldData, 
  description, 
  className, 
  onChange, 
  showConfidenceBar = true,
  ...props 
}: SmartInputProps) {
  // Safely extract a primitive value — recursively unwrap nested objects
  let rawValue: any = fieldData?.value ?? "";
  const unwrap = (v: any): any => {
    if (!v || typeof v !== 'object') return v;
    if ('value' in v) return unwrap(v.value);
    if ('name' in v) return unwrap(v.name);
    if ('label' in v) return unwrap(v.label);
    if ('address' in v) return unwrap(v.address);
    return "";
  };
  if (rawValue && typeof rawValue === 'object') {
    rawValue = unwrap(rawValue);
  }
  const value = rawValue;
  const confidence = fieldData?.confidence ?? 0;
  
  // Use controlled mode if onChange is provided, otherwise uncontrolled
  const inputProps = onChange 
    ? { value, onChange, ...props }
    : { defaultValue: value, ...props };

  // Determine confidence level
  const hasValue = fieldData?.value !== undefined && fieldData?.value !== null && fieldData?.value !== "";
  const level = hasValue ? getConfidenceLevel(confidence) : "none";
  const config = confidenceConfig[level];
  
  // Build status styles
  const statusClasses = `${config.bg} ${config.ring} border-l-4 ${config.border}`;

  // Confidence badge for high/medium/low
  const confidenceBadge = hasValue && level !== "none" ? (
    <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ring-1 ${config.badge}`}>
      {level === "high" && <CheckCircle2 className="w-3 h-3" />}
      {level === "medium" && <HelpCircle className="w-3 h-3" />}
      {level === "low" && <AlertTriangle className="w-3 h-3" />}
      {Math.round(confidence * 100)}%
    </span>
  ) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-sm font-medium text-stone-700">{label}</label>
        {confidenceBadge}
      </div>
      <input
        className={`w-full px-3 py-2.5 rounded-lg border border-stone-200 outline-none transition-all text-stone-900 placeholder:text-stone-400 ${statusClasses} ${className}`}
        {...inputProps}
      />
      {description && <p className="text-xs text-stone-400 mt-1.5">{description}</p>}
      
      {/* Optional confidence bar */}
      {showConfidenceBar && hasValue && confidence > 0 && (
        <div className="mt-1.5 h-1 bg-stone-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              level === "high" ? "bg-emerald-400" : 
              level === "medium" ? "bg-amber-400" : "bg-rose-400"
            }`}
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Export confidence indicator component for use in tables
export function ConfidenceDot({ confidence }: { confidence: number }) {
  const level = getConfidenceLevel(confidence);
  const colors = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-rose-500",
    none: "bg-stone-300",
  };
  
  return (
    <span 
      className={`inline-block w-2 h-2 rounded-full ${colors[level]}`}
      title={`${Math.round(confidence * 100)}% säkerhet`}
    />
  );
}