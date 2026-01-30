export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Server-side breadcrumb helpers
 * These can be called from server components
 */

import { getTenantConfig } from "@/config/tenant";

export function getDashboardBreadcrumbs(): BreadcrumbItem[] {
  const config = getTenantConfig();
  return [
    { label: `${config.companyName} Dashboard`, href: "/dashboard" },
  ];
}

export function getReviewBreadcrumbs(documentId: string, filename?: string): BreadcrumbItem[] {
  const config = getTenantConfig();
  return [
    { label: `${config.companyName} Dashboard`, href: "/dashboard" },
    { label: filename || `Document ${documentId.slice(0, 8)}` },
  ];
}

