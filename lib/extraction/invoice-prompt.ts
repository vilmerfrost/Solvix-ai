/**
 * Invoice Extraction Prompt Builder
 * Builds AI prompts for extracting Swedish invoice data
 */

export function buildInvoiceExtractionPrompt(
  content: string,
  filename: string,
): string {
  return `Extract ALL data from this Swedish invoice/faktura document to clean JSON.

═══════════════════════════════════════════════════════════════════════════════
DOCUMENT TYPE: INVOICE / FAKTURA
═══════════════════════════════════════════════════════════════════════════════

Extract these fields with confidence scores (0.0-1.0):

HEADER FIELDS:
- invoiceNumber: Fakturanummer, Faktura nr, Invoice #
- invoiceDate: Fakturadatum, Invoice date (output as YYYY-MM-DD)
- dueDate: Förfallodatum, Betalningsvillkor, Due date (output as YYYY-MM-DD)

SUPPLIER (Leverantör/Säljare):
- supplier: Company name of the sender/seller
- supplierOrgNr: Organisationsnummer (format: XXXXXX-XXXX)
- supplierAddress: Full address

BUYER (Köpare/Mottagare):
- buyerName: Company name of the recipient
- buyerOrgNr: Organisationsnummer

PAYMENT DETAILS:
- bankgiro: Bankgironummer (format: XXXX-XXXX or XXX-XXXX)
- plusgiro: Plusgironummer (format: XXXXXXX-X)
- ocrReference: OCR-referens / Betalningsreferens
- iban: IBAN number (if present)

AMOUNTS (use Swedish number format in source, output as numbers):
- subtotal: Summa exkl. moms / Netto
- vatAmount: Moms / Mervärdesskatt (the VAT amount in SEK)
- totalAmount: Att betala / Summa inkl. moms / Total
- currency: Valuta (default: "SEK")
- vatRate: Momssats as percentage (6, 12, or 25)

LINE ITEMS (extract ALL rows from the invoice table):
Each line item has:
- description: Beskrivning / Artikel / Text
- quantity: Antal / Kvantitet
- unitPrice: Á-pris / Enhetspris / Styckpris
- amount: Belopp / Summa (for this line)
- vatRate: Momssats for this line (if shown per line)

═══════════════════════════════════════════════════════════════════════════════
SWEDISH NUMBER PARSING
═══════════════════════════════════════════════════════════════════════════════
- Comma = decimal: "1 234,50" → 1234.50
- Space = thousands: "123 456" → 123456
- "kr" or "SEK" suffix: remove it
- Negative amounts may use minus OR parentheses: "(500,00)" = -500.00

═══════════════════════════════════════════════════════════════════════════════
DATE HANDLING
═══════════════════════════════════════════════════════════════════════════════
Output ALL dates as YYYY-MM-DD.
Recognize: "2025-01-15", "15 januari 2025", "15/01/2025", "2025.01.15"
For payment terms like "30 dagar netto": calculate due date from invoice date.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════
Return a JSON object with this EXACT structure. Every field uses {value, confidence} format.

{
  "documentType": "invoice",
  "invoiceNumber": {"value": "12345", "confidence": 0.95},
  "invoiceDate": {"value": "2025-01-15", "confidence": 0.98},
  "dueDate": {"value": "2025-02-14", "confidence": 0.90},
  "supplier": {"value": "Företag AB", "confidence": 0.95},
  "supplierOrgNr": {"value": "556123-4567", "confidence": 0.92},
  "supplierAddress": {"value": "Storgatan 1, 111 22 Stockholm", "confidence": 0.88},
  "buyerName": {"value": "Köpare AB", "confidence": 0.90},
  "buyerOrgNr": {"value": "559876-5432", "confidence": 0.85},
  "bankgiro": {"value": "1234-5678", "confidence": 0.95},
  "plusgiro": {"value": "", "confidence": 0},
  "ocrReference": {"value": "7234567890123", "confidence": 0.93},
  "iban": {"value": "", "confidence": 0},
  "subtotal": {"value": 10000, "confidence": 0.95},
  "vatAmount": {"value": 2500, "confidence": 0.95},
  "totalAmount": {"value": 12500, "confidence": 0.98},
  "currency": {"value": "SEK", "confidence": 0.99},
  "vatRate": {"value": 25, "confidence": 0.95},
  "invoiceLineItems": [
    {
      "description": {"value": "Konsulttjänster januari", "confidence": 0.92},
      "quantity": {"value": 40, "confidence": 0.90},
      "unitPrice": {"value": 250, "confidence": 0.90},
      "amount": {"value": 10000, "confidence": 0.95},
      "vatRate": {"value": 25, "confidence": 0.90}
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations.
CRITICAL: Use {value, confidence} wrappers for ALL fields except documentType and invoiceLineItems array.
CRITICAL: Confidence 0.0 = complete guess, 1.0 = absolutely certain.

FILENAME: ${filename}

Document content follows:
${content}`;
}

/** Detect if a document is likely an invoice based on text content */
export function isLikelyInvoice(text: string): boolean {
  const invoiceKeywords = [
    'faktura', 'invoice', 'fakturanummer', 'fakturadatum',
    'förfallodatum', 'att betala', 'betalningsvillkor',
    'bankgiro', 'plusgiro', 'ocr', 'moms', 'momssats',
    'exkl. moms', 'inkl. moms', 'netto', 'brutto',
    'á-pris', 'enhetspris', 'belopp',
    'organisationsnummer', 'org.nr', 'org nr',
    'momsreg', 'vat', 'f-skatt',
  ];

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of invoiceKeywords) {
    if (lowerText.includes(keyword)) matchCount++;
  }

  return matchCount >= 3;
}
