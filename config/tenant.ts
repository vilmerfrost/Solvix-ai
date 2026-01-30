// Tenant Configuration System
// Centralizes all customizable values for white-label deployments

import { createServiceRoleClient } from "@/lib/supabase";

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'sv' | 'en' | 'no' | 'fi';

export interface TenantConfig {
  // Branding
  companyName: string;
  companySlug: string;
  companyLogo?: string;
  primaryColor: string;
  
  // Localization
  language: SupportedLanguage;
  
  // Feature Flags
  enableVerification: boolean;
  autoApproveThreshold: number;
  
  // Domain-specific (waste management)
  knownReceivers: string[];
  
  // Setup status
  isSetupComplete: boolean;
}

export interface TenantBranding {
  companyName: string;
  companySlug: string;
  companyLogo?: string;
  primaryColor: string;
  language: SupportedLanguage;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  companyName: "Vextra AI",
  companySlug: "vextra-ai",
  companyLogo: undefined,
  primaryColor: "#6366F1", // Indigo-500 - Modern AI look
  language: "sv",
  enableVerification: false,
  autoApproveThreshold: 80,
  knownReceivers: [
    "Ragn-Sells",
    "Renova", 
    "NSR",
    "SITA",
    "Stena Recycling",
    "Återvinning AB"
  ],
  isSetupComplete: false,
};

// ============================================================================
// CONFIGURATION GETTERS
// ============================================================================

/**
 * Get tenant configuration from environment variables (synchronous)
 * Used for server-side rendering and API routes
 */
export function getTenantConfig(): TenantConfig {
  return {
    companyName: process.env.TENANT_NAME || DEFAULT_TENANT_CONFIG.companyName,
    companySlug: process.env.TENANT_SLUG || DEFAULT_TENANT_CONFIG.companySlug,
    companyLogo: process.env.TENANT_LOGO_URL || DEFAULT_TENANT_CONFIG.companyLogo,
    primaryColor: process.env.TENANT_PRIMARY_COLOR || DEFAULT_TENANT_CONFIG.primaryColor,
    language: (process.env.TENANT_LANGUAGE as SupportedLanguage) || DEFAULT_TENANT_CONFIG.language,
    enableVerification: process.env.ENABLE_VERIFICATION === "true",
    autoApproveThreshold: parseInt(process.env.AUTO_APPROVE_THRESHOLD || "80", 10),
    knownReceivers: process.env.TENANT_KNOWN_RECEIVERS 
      ? process.env.TENANT_KNOWN_RECEIVERS.split(",").map(r => r.trim())
      : DEFAULT_TENANT_CONFIG.knownReceivers,
    isSetupComplete: process.env.TENANT_NAME ? true : false,
  };
}

/**
 * Get tenant configuration from database (async)
 * Falls back to environment variables if database config not found
 */
export async function getTenantConfigFromDB(): Promise<TenantConfig> {
  const supabase = createServiceRoleClient();
  
  try {
    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", "default")
      .single();

    if (error || !settings) {
      // Fall back to environment config
      return getTenantConfig();
    }

    // Merge database settings with defaults and env
    const envConfig = getTenantConfig();
    
    return {
      companyName: settings.company_name || envConfig.companyName,
      companySlug: settings.company_slug || envConfig.companySlug,
      companyLogo: settings.company_logo_url || envConfig.companyLogo,
      primaryColor: settings.primary_color || envConfig.primaryColor,
      language: (settings.language as SupportedLanguage) || envConfig.language,
      enableVerification: settings.enable_verification ?? envConfig.enableVerification,
      autoApproveThreshold: settings.auto_approve_threshold ?? envConfig.autoApproveThreshold,
      knownReceivers: settings.known_receivers || envConfig.knownReceivers,
      isSetupComplete: settings.is_setup_complete ?? envConfig.isSetupComplete,
    };
  } catch {
    // Fall back to environment config on any error
    return getTenantConfig();
  }
}

/**
 * Check if the system has been configured (setup wizard completed)
 */
export async function isSystemConfigured(): Promise<boolean> {
  // First check if env var is set (pre-configured deployment)
  if (process.env.TENANT_NAME) {
    return true;
  }

  // Otherwise check database
  const supabase = createServiceRoleClient();
  
  try {
    const { data: settings, error } = await supabase
      .from("settings")
      .select("is_setup_complete")
      .eq("user_id", "default")
      .single();

    if (error || !settings) {
      return false;
    }

    return settings.is_setup_complete === true;
  } catch {
    return false;
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Get localized UI strings based on tenant language
 */
export function getUIStrings(config: TenantConfig) {
  const strings = {
    sv: {
      dashboard: "Dashboard",
      review: "Granskning",
      reviewDescription: `Granska och godkänn dokument för ${config.companyName}.`,
      settings: "Inställningar",
      health: "Systemstatus",
      back: "Tillbaka",
      approve: "Godkänn",
      reject: "Avvisa",
      export: "Exportera",
      uploaded: "Uppladdad",
      processing: "Behandlar",
      needsReview: "Behöver granskning",
      approved: "Godkänd",
      exported: "Exporterad",
      error: "Fel",
      total: "Totalt",
      documents: "Dokument",
      systemOnline: "SYSTEM ONLINE",
      noDocuments: "Inga dokument ännu",
      allReviewed: "Alla dokument har granskats!",
      material: "Material",
      weight: "Vikt",
      date: "Datum",
      address: "Adress",
      completeness: "Fullständighet",
      active: "Aktiva",
      archived: "Arkiverade",
    },
    en: {
      dashboard: "Dashboard",
      review: "Review",
      reviewDescription: `Review and approve documents for ${config.companyName}.`,
      settings: "Settings",
      health: "System Health",
      back: "Back",
      approve: "Approve",
      reject: "Reject",
      export: "Export",
      uploaded: "Uploaded",
      processing: "Processing",
      needsReview: "Needs Review",
      approved: "Approved",
      exported: "Exported",
      error: "Error",
      total: "Total",
      documents: "Documents",
      systemOnline: "SYSTEM ONLINE",
      noDocuments: "No documents yet",
      allReviewed: "All documents have been reviewed!",
      material: "Material",
      weight: "Weight",
      date: "Date",
      address: "Address",
      completeness: "Completeness",
      active: "Active",
      archived: "Archived",
    },
    no: {
      dashboard: "Dashbord",
      review: "Gjennomgang",
      reviewDescription: `Gjennomgå og godkjenn dokumenter for ${config.companyName}.`,
      settings: "Innstillinger",
      health: "Systemstatus",
      back: "Tilbake",
      approve: "Godkjenn",
      reject: "Avvis",
      export: "Eksporter",
      uploaded: "Lastet opp",
      processing: "Behandler",
      needsReview: "Trenger gjennomgang",
      approved: "Godkjent",
      exported: "Eksportert",
      error: "Feil",
      total: "Totalt",
      documents: "Dokumenter",
      systemOnline: "SYSTEM ONLINE",
      noDocuments: "Ingen dokumenter ennå",
      allReviewed: "Alle dokumenter er gjennomgått!",
      material: "Materiale",
      weight: "Vekt",
      date: "Dato",
      address: "Adresse",
      completeness: "Fullstendighet",
      active: "Aktive",
      archived: "Arkiverte",
    },
    fi: {
      dashboard: "Kojelauta",
      review: "Tarkistus",
      reviewDescription: `Tarkista ja hyväksy asiakirjat yritykselle ${config.companyName}.`,
      settings: "Asetukset",
      health: "Järjestelmän tila",
      back: "Takaisin",
      approve: "Hyväksy",
      reject: "Hylkää",
      export: "Vie",
      uploaded: "Ladattu",
      processing: "Käsitellään",
      needsReview: "Tarvitsee tarkistuksen",
      approved: "Hyväksytty",
      exported: "Viety",
      error: "Virhe",
      total: "Yhteensä",
      documents: "Asiakirjat",
      systemOnline: "JÄRJESTELMÄ ONLINE",
      noDocuments: "Ei asiakirjoja vielä",
      allReviewed: "Kaikki asiakirjat on tarkistettu!",
      material: "Materiaali",
      weight: "Paino",
      date: "Päivämäärä",
      address: "Osoite",
      completeness: "Täydellisyys",
      active: "Aktiiviset",
      archived: "Arkistoidut",
    },
  };

  return strings[config.language] || strings.sv;
}

/**
 * Get the HTML lang attribute value
 */
export function getHtmlLang(config: TenantConfig): string {
  const langMap: Record<SupportedLanguage, string> = {
    sv: "sv",
    en: "en",
    no: "no",
    fi: "fi",
  };
  return langMap[config.language] || "sv";
}

/**
 * Generate page title with company name
 */
export function getPageTitle(config: TenantConfig, pageName?: string): string {
  if (pageName) {
    return `${pageName} | ${config.companyName}`;
  }
  return `${config.companyName} - Intelligent Document Extraction`;
}
