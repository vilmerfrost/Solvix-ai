/**
 * Utility function to merge classNames conditionally
 * Simple implementation for className merging
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
