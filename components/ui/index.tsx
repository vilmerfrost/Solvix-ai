/**
 * Vextra AI UI Components
 * 
 * Shared components with consistent styling based on the design system.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";

// ============================================================================
// Button Component
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm",
    secondary: "bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 focus:ring-stone-500",
    ghost: "hover:bg-stone-100 text-stone-600 focus:ring-stone-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-sm",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

// ============================================================================
// Card Component
// ============================================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  const variants = {
    default: "bg-white rounded-xl border border-stone-200 shadow-sm",
    hover: "bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all",
    interactive: "bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer",
  };
  
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={`${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-stone-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-stone-500 mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-6 pt-4 border-t border-stone-100 ${className}`}>{children}</div>;
}

// ============================================================================
// Badge Component
// ============================================================================

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  children,
  className = "",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-stone-100 text-stone-700",
    primary: "bg-indigo-100 text-indigo-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };
  
  const dotColors = {
    default: "bg-stone-500",
    primary: "bg-indigo-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };
  
  const sizes = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-0.5 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

// ============================================================================
// Input Component
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3.5 py-2.5 rounded-lg border transition-colors
              ${icon ? "pl-10" : ""}
              ${error
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-stone-300 bg-white focus:ring-indigo-500 focus:border-indigo-500"
              }
              text-stone-900 placeholder:text-stone-400
              focus:outline-none focus:ring-2
              disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-stone-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// ============================================================================
// Select Component
// ============================================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3.5 py-2.5 rounded-lg border transition-colors
            ${error
              ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
              : "border-stone-300 bg-white focus:ring-indigo-500 focus:border-indigo-500"
            }
            text-stone-900 focus:outline-none focus:ring-2
            disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

// ============================================================================
// Status Badge (Document statuses)
// ============================================================================

interface StatusBadgeProps {
  status: "uploaded" | "processing" | "needs_review" | "approved" | "exported" | "error" | "rejected";
  showDot?: boolean;
  className?: string;
}

const statusConfig = {
  uploaded: { bg: "bg-stone-100", text: "text-stone-700", dot: "bg-stone-500", label: "Uppladdad" },
  processing: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", label: "Bearbetar" },
  needs_review: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", label: "Granskas" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Godkänd" },
  exported: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", label: "Exporterad" },
  error: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Fel" },
  rejected: { bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400", label: "Avvisad" },
};

export function StatusBadge({ status, showDot = true, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.uploaded;
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}

// ============================================================================
// Confidence Indicator
// ============================================================================

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceIndicator({ 
  confidence, 
  showLabel = false, 
  size = "md",
  className = "" 
}: ConfidenceIndicatorProps) {
  const level = confidence >= 90 ? "high" : confidence >= 60 ? "medium" : "low";
  
  const config = {
    high: { 
      bg: "bg-emerald-100", 
      text: "text-emerald-700", 
      dot: "bg-emerald-500",
      label: "Hög säkerhet" 
    },
    medium: { 
      bg: "bg-amber-100", 
      text: "text-amber-700", 
      dot: "bg-amber-500",
      label: "Kontrollera" 
    },
    low: { 
      bg: "bg-rose-100", 
      text: "text-rose-700", 
      dot: "bg-rose-500",
      label: "Osäker" 
    },
  };
  
  const c = config[level];
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${c.bg} ${c.text} ${sizeClasses} ${className}`}
      title={`${confidence}% säkerhet`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {showLabel ? c.label : `${Math.round(confidence)}%`}
    </span>
  );
}

// ============================================================================
// Page Header Component
// ============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
          {description && <p className="mt-1 text-stone-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-stone-900 mb-1">{title}</h3>
      {description && <p className="text-stone-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================================
// Divider Component
// ============================================================================

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-stone-200 ${className}`} />;
}

// ============================================================================
// Skeleton Components
// ============================================================================

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`} 
        />
      ))}
    </div>
  );
}
