/**
 * Vextra AI Design System
 * 
 * Professional color palette inspired by Stripe, Linear, and Raycast.
 * Light mode with warm neutrals and a refined indigo primary.
 */

// Primary colors - Deep indigo (Stripe-inspired)
export const colors = {
  primary: {
    50: '#f5f5ff',
    100: '#ebebff',
    200: '#d6d6ff',
    300: '#b3b3ff',
    400: '#8585ff',
    500: '#6366f1',  // Main primary
    600: '#4f46e5',  // Hover
    700: '#4338ca',  // Active
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Neutral - Warm stone (not cold gray)
  neutral: {
    50: '#fafaf9',   // Page background
    100: '#f5f5f4',  // Card background hover
    200: '#e7e5e4',  // Borders
    300: '#d6d3d1',  // Disabled borders
    400: '#a8a29e',  // Muted text
    500: '#78716c',  // Secondary text
    600: '#57534e',  // Body text
    700: '#44403c',  // Headings
    800: '#292524',  // Primary text
    900: '#1c1917',  // Dark text
  },
  
  // Status colors - Muted and professional
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
} as const;

// Shadows - Subtle and refined
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
} as const;

// Border radius
export const radius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  },
} as const;

// Component-specific styles
export const components = {
  // Buttons
  button: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm',
    secondary: 'bg-white hover:bg-stone-50 text-stone-700 font-medium px-4 py-2.5 rounded-lg border border-stone-200 transition-colors',
    ghost: 'hover:bg-stone-100 text-stone-600 font-medium px-4 py-2.5 rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors',
  },
  
  // Cards
  card: {
    base: 'bg-white rounded-xl border border-stone-200 shadow-sm',
    hover: 'bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all',
    interactive: 'bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer',
  },
  
  // Inputs
  input: {
    base: 'w-full px-3.5 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors',
    error: 'w-full px-3.5 py-2.5 border border-red-300 rounded-lg bg-red-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500',
  },
  
  // Badges
  badge: {
    default: 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-700',
    primary: 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700',
    success: 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700',
    warning: 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700',
    error: 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700',
  },
} as const;

// Confidence visualization styles (professional, muted)
export const confidence = {
  high: {
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-700',
    label: 'Hög säkerhet',
  },
  medium: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50/50',
    text: 'text-amber-700',
    label: 'Kontrollera',
  },
  low: {
    border: 'border-l-rose-400',
    bg: 'bg-rose-50/50',
    text: 'text-rose-700',
    label: 'Osäker',
  },
} as const;

// Get confidence level from percentage
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 90) return 'high';
  if (confidence >= 60) return 'medium';
  return 'low';
}

// Status styles mapping
export const statusStyles = {
  uploaded: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-500' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  needs_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  exported: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  error: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  rejected: { bg: 'bg-stone-100', text: 'text-stone-500', dot: 'bg-stone-400' },
} as const;

export type StatusType = keyof typeof statusStyles;
