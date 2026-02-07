/**
 * Swedish Format Parser Library
 * Parses and validates Swedish-specific business formats:
 * - Number formatting (spaces as thousands, comma decimal)
 * - Organisationsnummer (org.nr)
 * - Plusgiro / Bankgiro
 * - OCR-referensnummer
 * - Momsregistreringsnummer (VAT)
 */

// ============================================================================
// SWEDISH NUMBER PARSING
// ============================================================================

/**
 * Parse Swedish number format: "123 456 789,50" -> 123456789.50
 * Handles comma decimals, space thousands, no-break spaces, European mixed formats
 */
export function parseSwedishNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  let s = value.trim();
  if (!s) return null;

  // Remove currency symbols and suffixes
  s = s.replace(/\s*(kr|SEK|sek|:-|öre)\s*$/i, "").trim();
  s = s.replace(/^\s*(kr|SEK|sek)\s*/i, "").trim();

  // Remove all whitespace (regular, no-break, thin)
  s = s.replace(/[\s\u00A0\u2009\u202F]+/g, "");

  // Detect European format: dots as thousands, comma as decimal
  if (s.includes(".") && s.includes(",")) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// LUHN ALGORITHM
// ============================================================================

function luhnValidate(digits: string): boolean {
  if (!digits || digits.length < 2) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (isNaN(n)) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ============================================================================
// ORGANISATIONSNUMMER
// ============================================================================

/** Parse and validate Swedish org.nr (XXXXXX-XXXX, 10 digits, Luhn checked) */
export function parseOrgNr(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  let tenDigits = digits.length === 12 ? digits.slice(2) : digits;
  if (tenDigits.length !== 10) return null;
  if (parseInt(tenDigits[2]) < 2) return null;
  if (!luhnValidate(tenDigits)) return null;
  return `${tenDigits.slice(0, 6)}-${tenDigits.slice(6)}`;
}

/** Detect org.nr in text */
export function detectOrgNr(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const pattern = /\b(\d{6})-?(\d{4})\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const parsed = parseOrgNr(match[1] + match[2]);
    if (parsed && !results.includes(parsed)) results.push(parsed);
  }
  return results;
}

// ============================================================================
// PLUSGIRO / BANKGIRO
// ============================================================================

export function parsePlusgiro(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const s = value.replace(/^(pg|plusgiro|plus\s*giro)\s*:?\s*/i, "").trim();
  const digits = s.replace(/[\s-]/g, "").replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 8) return null;
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

export function parseBankgiro(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const s = value.replace(/^(bg|bankgiro|bank\s*giro)\s*:?\s*/i, "").trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 8) return null;
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

export function detectPaymentNumbers(text: string): {
  plusgiro: string[];
  bankgiro: string[];
} {
  if (!text) return { plusgiro: [], bankgiro: [] };
  const plusgiro: string[] = [];
  const bankgiro: string[] = [];

  const pgPattern = /(?:pg|plusgiro|plus\s*giro)\s*:?\s*([\d\s-]+)/gi;
  let m;
  while ((m = pgPattern.exec(text)) !== null) {
    const p = parsePlusgiro(m[1]);
    if (p && !plusgiro.includes(p)) plusgiro.push(p);
  }

  const bgPattern = /(?:bg|bankgiro|bank\s*giro)\s*:?\s*([\d\s-]+)/gi;
  while ((m = bgPattern.exec(text)) !== null) {
    const b = parseBankgiro(m[1]);
    if (b && !bankgiro.includes(b)) bankgiro.push(b);
  }

  return { plusgiro, bankgiro };
}

// ============================================================================
// OCR REFERENCE
// ============================================================================

export function parseOcrReference(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 25) return null;
  if (!luhnValidate(digits)) return null;
  return digits;
}

export function detectOcrReference(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const pattern =
    /(?:ocr|ref\.?\s*(?:nr|nummer)?|referens)\s*:?\s*(\d[\d\s]{1,24}\d)/gi;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const p = parseOcrReference(m[1].replace(/\s/g, ""));
    if (p && !results.includes(p)) results.push(p);
  }
  return results;
}

// ============================================================================
// VAT NUMBER
// ============================================================================

export function parseVatNumber(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  let s = value.replace(/\s/g, "").toUpperCase();
  if (!s.startsWith("SE")) {
    if (s.replace(/\D/g, "").length === 12) s = "SE" + s.replace(/\D/g, "");
    else return null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.endsWith("01")) return null;
  if (!luhnValidate(digits.slice(0, 10))) return null;
  return `SE${digits}`;
}

export function detectVatNumber(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const pattern = /SE\s*\d{12}/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const p = parseVatNumber(m[0]);
    if (p && !results.includes(p)) results.push(p);
  }
  return results;
}

// ============================================================================
// VAT INFO
// ============================================================================

export interface VatInfo {
  rate: number | null;
  amount: number | null;
  isInclusive: boolean;
}

export function detectVatInfo(text: string): VatInfo {
  const info: VatInfo = { rate: null, amount: null, isInclusive: false };
  if (!text) return info;

  const rateMatch = text.match(/moms\s*(\d{1,2})\s*%/i);
  if (rateMatch) {
    const rate = parseInt(rateMatch[1]);
    if ([6, 12, 25].includes(rate)) info.rate = rate;
  }

  const amountMatch = text.match(
    /(?:varav\s+)?moms\s*:?\s*([\d\s,.]+)\s*(?:kr|SEK)?/i
  );
  if (amountMatch) info.amount = parseSwedishNumber(amountMatch[1]);

  if (/inkl\.?\s*moms/i.test(text)) info.isInclusive = true;
  if (/exkl\.?\s*moms/i.test(text)) info.isInclusive = false;

  return info;
}

// ============================================================================
// MASTER DETECT
// ============================================================================

export interface SwedishDocumentMetadata {
  orgNr: string[];
  plusgiro: string[];
  bankgiro: string[];
  ocrReferences: string[];
  vatNumbers: string[];
  vatInfo: VatInfo;
}

/** Run all Swedish format detectors on a text block */
export function detectSwedishFormats(text: string): SwedishDocumentMetadata {
  const payment = detectPaymentNumbers(text);
  return {
    orgNr: detectOrgNr(text),
    plusgiro: payment.plusgiro,
    bankgiro: payment.bankgiro,
    ocrReferences: detectOcrReference(text),
    vatNumbers: detectVatNumber(text),
    vatInfo: detectVatInfo(text),
  };
}
