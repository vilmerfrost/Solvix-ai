/**
 * Vextra AI UI Components
 * 
 * Premium design system components with theme support,
 * micro-interactions, and WCAG AA compliance.
 */

"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Loader2, X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

// ============================================================================
// Button Component
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-lg 
    transition-all duration-150 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-[0.98]
  `;
  
  const variants = {
    primary: `
      bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] 
      text-white focus-visible:ring-[var(--color-accent)]
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-secondary)] 
      text-[var(--color-text-primary)] 
      border border-[var(--color-border)] hover:border-[var(--color-border-strong)]
      focus-visible:ring-[var(--color-accent)]
    `,
    ghost: `
      hover:bg-[var(--color-bg-secondary)] 
      text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
      focus-visible:ring-[var(--color-accent)]
    `,
    danger: `
      bg-[var(--color-error)] hover:bg-red-600 
      text-white focus-visible:ring-[var(--color-error)]
      shadow-sm hover:shadow-md
    `,
    success: `
      bg-[var(--color-success)] hover:bg-emerald-600 
      text-white focus-visible:ring-[var(--color-success)]
      shadow-sm hover:shadow-md
    `,
  };
  
  const sizes = {
    xs: "px-2 py-1 text-xs gap-1",
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
      ) : icon && iconPosition === "left" ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
}

// ============================================================================
// Card Component
// ============================================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "interactive" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  const baseStyles = `
    bg-[var(--color-bg-elevated)] rounded-xl 
    border border-[var(--color-border)]
    transition-all duration-150
  `;
  
  const variants = {
    default: "shadow-[var(--shadow-sm)]",
    hover: "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)]",
    interactive: "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)] cursor-pointer",
    elevated: "shadow-[var(--shadow-md)]",
  };
  
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-[var(--color-text-primary)] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-[var(--color-text-muted)] mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-6 pt-4 border-t border-[var(--color-border-muted)] ${className}`}>{children}</div>;
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
    default: "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
    primary: "bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border border-[var(--color-accent)]/20",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)]",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]",
    error: "bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error-border)]",
    info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border border-[var(--color-info-border)]",
  };
  
  const dotColors = {
    default: "bg-[var(--color-text-muted)]",
    primary: "bg-[var(--color-accent)]",
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    error: "bg-[var(--color-error)]",
    info: "bg-[var(--color-info)]",
  };
  
  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
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
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3.5 py-2.5 rounded-lg 
              border transition-all duration-150
              bg-[var(--color-bg)] 
              ${icon ? "pl-10" : ""}
              ${error
                ? "border-[var(--color-error)] bg-[var(--color-error-bg)]/30 focus:ring-[var(--color-error)]"
                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
              }
              text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-[var(--color-bg-inset)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-[var(--color-error-text)]">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{hint}</p>}
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
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3.5 py-2.5 rounded-lg 
            border transition-all duration-150
            bg-[var(--color-bg)]
            ${error
              ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
              : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            }
            text-[var(--color-text-primary)]
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-[var(--color-bg-inset)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed
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
        {error && <p className="mt-1.5 text-sm text-[var(--color-error-text)]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

// ============================================================================
// Status Badge (Document statuses)
// ============================================================================

interface StatusBadgeProps {
  status: "uploaded" | "queued" | "processing" | "needs_review" | "approved" | "exported" | "error" | "rejected" | "verified";
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  uploaded: { 
    bg: "bg-[var(--color-bg-secondary)]", 
    text: "text-[var(--color-text-secondary)]", 
    dot: "bg-[var(--color-text-muted)]", 
    border: "border-[var(--color-border)]",
    label: "Uppladdad",
    icon: null
  },
  queued: { 
    bg: "bg-[var(--color-info-bg)]", 
    text: "text-[var(--color-info-text)]", 
    dot: "bg-[var(--color-info)]", 
    border: "border-[var(--color-info-border)]",
    label: "I kö",
    icon: null
  },
  processing: { 
    bg: "bg-[var(--color-info-bg)]", 
    text: "text-[var(--color-info-text)]", 
    dot: "bg-[var(--color-info)]", 
    border: "border-[var(--color-info-border)]",
    label: "Bearbetar",
    icon: Loader2
  },
  needs_review: { 
    bg: "bg-[var(--color-warning-bg)]", 
    text: "text-[var(--color-warning-text)]", 
    dot: "bg-[var(--color-warning)]", 
    border: "border-[var(--color-warning-border)]",
    label: "Granska",
    icon: AlertTriangle
  },
  approved: { 
    bg: "bg-[var(--color-success-bg)]", 
    text: "text-[var(--color-success-text)]", 
    dot: "bg-[var(--color-success)]", 
    border: "border-[var(--color-success-border)]",
    label: "Godkänd",
    icon: CheckCircle
  },
  verified: { 
    bg: "bg-[var(--color-success-bg)]", 
    text: "text-[var(--color-success-text)]", 
    dot: "bg-[var(--color-success)]", 
    border: "border-[var(--color-success-border)]",
    label: "Verifierad",
    icon: CheckCircle
  },
  exported: { 
    bg: "bg-[var(--color-accent-muted)]", 
    text: "text-[var(--color-accent-text)]", 
    dot: "bg-[var(--color-accent)]", 
    border: "border-[var(--color-accent)]/20",
    label: "Exporterad",
    icon: null
  },
  error: { 
    bg: "bg-[var(--color-error-bg)]", 
    text: "text-[var(--color-error-text)]", 
    dot: "bg-[var(--color-error)]", 
    border: "border-[var(--color-error-border)]",
    label: "Fel",
    icon: AlertCircle
  },
  rejected: { 
    bg: "bg-[var(--color-bg-secondary)]", 
    text: "text-[var(--color-text-muted)]", 
    dot: "bg-[var(--color-text-disabled)]", 
    border: "border-[var(--color-border)]",
    label: "Avvisad",
    icon: null
  },
};

export function StatusBadge({ status, showDot = true, showIcon = false, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.uploaded;
  const IconComponent = config.icon;
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
        text-xs font-medium border
        ${config.bg} ${config.text} ${config.border} ${className}
        ${status === 'processing' ? 'animate-pulse' : ''}
      `}
    >
      {showIcon && IconComponent ? (
        <IconComponent className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      ) : showDot ? (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      ) : null}
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
      bg: "bg-[var(--color-success-bg)]", 
      text: "text-[var(--color-success-text)]", 
      dot: "bg-[var(--color-success)]",
      border: "border-[var(--color-success-border)]",
      label: "Hög" 
    },
    medium: { 
      bg: "bg-[var(--color-warning-bg)]", 
      text: "text-[var(--color-warning-text)]", 
      dot: "bg-[var(--color-warning)]",
      border: "border-[var(--color-warning-border)]",
      label: "Medium" 
    },
    low: { 
      bg: "bg-[var(--color-error-bg)]", 
      text: "text-[var(--color-error-text)]", 
      dot: "bg-[var(--color-error)]",
      border: "border-[var(--color-error-border)]",
      label: "Låg" 
    },
  };
  
  const c = config[level];
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${c.bg} ${c.text} ${c.border} ${sizeClasses} ${className}
      `}
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          {description && <p className="mt-1 text-[var(--color-text-muted)]">{description}</p>}
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4 text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && <p className="text-[var(--color-text-muted)] mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================================
// Divider Component
// ============================================================================

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-[var(--color-border)] ${className}`} />;
}

// ============================================================================
// Skeleton Components
// ============================================================================

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} />
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

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={`animate-spin text-[var(--color-accent)] ${sizes[size]} ${className}`} />
  );
}

// ============================================================================
// Toast System
// ============================================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: "border-[var(--color-success)] text-[var(--color-success)]",
    error: "border-[var(--color-error)] text-[var(--color-error)]",
    warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
    info: "border-[var(--color-info)] text-[var(--color-info)]",
  };

  const Icon = icons[toast.type];

  return (
    <div 
      className={`
        animate-fade-in
        bg-[var(--color-bg-elevated)] border-l-4 ${colors[toast.type]}
        rounded-lg shadow-[var(--shadow-lg)] p-4 pr-10 min-w-[320px] max-w-[420px]
        relative
      `}
    >
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors[toast.type].split(' ')[1]}`} />
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">{toast.title}</p>
          {toast.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{toast.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Progress Bar
// ============================================================================

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function Progress({ value, max = 100, size = "md", showLabel = false, className = "" }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
  };

  return (
    <div className={className}>
      <div className={`w-full bg-[var(--color-bg-inset)] rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// ============================================================================
// Tooltip (simple CSS-based)
// ============================================================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`
          absolute ${positions[position]} z-50
          px-2 py-1 text-xs font-medium
          bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]
          rounded shadow-lg
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-150
          whitespace-nowrap
        `}
      >
        {content}
      </div>
    </div>
  );
}

// ============================================================================
// Avatar Component
// ============================================================================

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, alt = "", fallback, size = "md", className = "" }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = fallback || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div 
      className={`
        ${sizes[size]} rounded-full overflow-hidden
        bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]
        flex items-center justify-center font-medium
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
