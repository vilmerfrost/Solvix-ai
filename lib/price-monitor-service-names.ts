/**
 * Known SaaS/invoice services → preferred product display name.
 * When a supplier matches, we use this name instead of raw line-item descriptions,
 * so e.g. a Supabase invoice with 80 usage rows becomes one product "Supabase Pro".
 */

export const SERVICE_PRODUCT_NAMES: Array<{
  /** Supplier name patterns (case-insensitive, partial match) */
  patterns: string[];
  /** Product name to use in /products */
  productName: string;
}> = [
  { patterns: ["supabase"], productName: "Supabase Pro" },
  { patterns: ["vercel"], productName: "Vercel Pro" },
  { patterns: ["mistral ai", "mistral"], productName: "Mistral AI" },
  { patterns: ["openai"], productName: "OpenAI" },
  { patterns: ["anthropic"], productName: "Anthropic Claude" },
  { patterns: ["moonshot"], productName: "Moonshot AI" },
  { patterns: ["railway"], productName: "Railway" },
  { patterns: ["render"], productName: "Render" },
  { patterns: ["fly.io", "fly io"], productName: "Fly.io" },
  { patterns: ["cloudflare"], productName: "Cloudflare" },
  { patterns: ["aws", "amazon web services"], productName: "AWS" },
  { patterns: ["google cloud", "gcp"], productName: "Google Cloud" },
  { patterns: ["azure", "microsoft azure"], productName: "Microsoft Azure" },
  { patterns: ["stripe"], productName: "Stripe" },
  { patterns: ["github"], productName: "GitHub" },
  { patterns: ["gitlab"], productName: "GitLab" },
  { patterns: ["linear"], productName: "Linear" },
  { patterns: ["notion"], productName: "Notion" },
  { patterns: ["slack"], productName: "Slack" },
  { patterns: ["figma"], productName: "Figma" },
  { patterns: ["datadog"], productName: "Datadog" },
  { patterns: ["sentry"], productName: "Sentry" },
  { patterns: ["twilio"], productName: "Twilio" },
  { patterns: ["sendgrid"], productName: "SendGrid" },
  { patterns: ["postmark"], productName: "Postmark" },
  { patterns: ["superultra"], productName: "SuperUltra" },
];

/**
 * Returns the preferred product name if the supplier matches a known service, else null.
 */
export function getServiceProductName(supplierName: string | null | undefined): string | null {
  const name = (supplierName ?? "").trim().toLowerCase();
  if (!name) return null;

  for (const { patterns, productName } of SERVICE_PRODUCT_NAMES) {
    if (patterns.some((p) => name.includes(p))) return productName;
  }
  return null;
}
