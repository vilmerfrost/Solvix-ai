import { createServiceRoleClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { getHiddenFields } from "@/config/industries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Save,
  ArrowRight
} from "lucide-react";
import { ExtractionRunViewer } from "@/components/extraction-run-viewer";
import { ReverifyButton } from "@/components/reverify-button";
import { ExcelViewer } from "@/components/excel-viewer";
import { ReviewForm } from "@/components/review-form";
import { PaginatedTable } from "@/components/paginated-table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getReviewBreadcrumbs } from "@/lib/breadcrumb-utils";
import { truncateFilename } from "@/lib/filename-utils";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { getTenantConfigFromDB, getUIStrings } from "@/config/tenant";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const supabase = createServiceRoleClient();
  const { id } = await params;
  
  // Get tenant configuration
  const config = await getTenantConfigFromDB();
  const strings = getUIStrings(config);

  // Get user's industry for column filtering
  const { data: userSettings } = await supabase
    .from("settings")
    .select("industry")
    .eq("user_id", user.id)
    .single();
  
  const hiddenFields = getHiddenFields(userSettings?.industry || 'general');

  // Fetch document
  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!doc) notFound();

  // Fetch next document needing review (for "Nästa" button)
  const { data: nextDocs } = await supabase
    .from("documents")
    .select("id")
    .eq("status", "needs_review")
    .neq("id", id)
    .order("created_at", { ascending: true })
    .limit(1);
  
  const nextDocId = nextDocs?.[0]?.id;

  // Fetch audit log for this document
  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("*")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Use preview endpoint to ensure inline display and avoid downloads
  const previewUrl = `/api/preview-file?id=${doc.id}`;
  const isExcel = doc.filename.toLowerCase().endsWith(".xlsx") || 
                  doc.filename.toLowerCase().endsWith(".xls");

  const extractedData = doc.extracted_data || {};
  const lineItems = extractedData.lineItems || [];
  
  // Helper to get value (handle both wrapped {value, confidence} and clean formats)
  const getValue = (field: any): any => {
    if (!field) return null;
    if (typeof field === 'object' && 'value' in field) {
      return field.value;
    }
    return field;
  };

  // === EXPORT PREVIEW DATA ===
  // Apply the SAME fallbacks as the export-to-azure route so users see the final result
  // Get document-level metadata for fallbacks
  const docDate = getValue(extractedData.documentMetadata?.date) || 
                  getValue(extractedData.date) || 
                  (() => {
                    // Try to extract from filename
                    const match = doc.filename.replace(/\s*\(\d+\)/g, '').match(/(\d{4}-\d{2}-\d{2})/);
                    return match ? match[1] : new Date().toISOString().split('T')[0];
                  })();
  const docAddress = getValue(extractedData.documentMetadata?.address) || getValue(extractedData.address) || "";
  const docReceiver = getValue(extractedData.documentMetadata?.receiver) || getValue(extractedData.receiver) || "";
  const docSupplier = getValue(extractedData.documentMetadata?.supplier) || getValue(extractedData.supplier) || "";

  // ✅ Helper: Check if a value is a placeholder/default that should be replaced
  const isPlaceholderValue = (val: string | null | undefined): boolean => {
    if (!val || typeof val !== 'string') return true;
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === '' ||
      trimmed === 'okänd mottagare' ||
      trimmed === 'okänd adress' ||
      trimmed === 'okänt material' ||
      trimmed === 'saknas' ||
      trimmed === 'unknown'
    );
  };

  // Create export preview rows (exactly what will be in Excel)
  // ✅ FIX: Treat placeholder values like "Okänd mottagare" as empty so document-level values apply
  const exportPreviewRows = lineItems.map((item: any, idx: number) => {
    const rowReceiver = getValue(item.receiver);
    const rowLocation = getValue(item.location) || getValue(item.address);
    
    return {
      rowNum: idx + 1,
      date: getValue(item.date) || docDate,
      location: isPlaceholderValue(rowLocation) ? docAddress : rowLocation,
      material: getValue(item.material) || "Okänt material",
      weightKg: parseFloat(String(getValue(item.weightKg) || getValue(item.weight) || 0)),
      unit: getValue(item.unit) || "Kg",
      receiver: isPlaceholderValue(rowReceiver) ? (docReceiver || "Okänd mottagare") : rowReceiver,
      isHazardous: getValue(item.isHazardous) || false,
    };
  });
  
  // Calculate stats from lineItems
  const uniqueAddresses = new Set(
    lineItems
      .map((item: any) => {
        const addr = getValue(item.address) || getValue(item.location);
        return addr && addr !== "SAKNAS" ? addr : null;
      })
      .filter(Boolean)
  ).size;
  
  const uniqueReceivers = new Set(
    lineItems
      .map((item: any) => {
        const rec = getValue(item.receiver);
        return rec || null;
      })
      .filter(Boolean)
  ).size;
  
  const uniqueMaterials = new Set(
    lineItems
      .map((item: any) => {
        const mat = getValue(item.material);
        return mat || null;
      })
      .filter(Boolean)
  ).size;

  const totalWeightKg = lineItems.reduce(
    (sum: number, item: any) => {
      const weight = getValue(item.weightKg);
      return sum + (Number(weight) || 0);
    },
    0
  );

  const totalCost = lineItems.reduce(
    (sum: number, item: any) => {
      const cost = getValue(item.costSEK) || getValue(item.cost);
      return sum + (Number(cost) || 0);
    },
    Number(getValue(extractedData.costSEK) || getValue(extractedData.cost)) || 0
  );

  const totalCo2 = lineItems.reduce(
    (sum: number, item: any) => {
      const co2 = getValue(item.co2Saved) || getValue(item.co2);
      return sum + (Number(co2) || 0);
    },
    0
  );

  // Dynamic column detection - only show columns that exist in data
  function detectExistingColumns(items: any[]): {
    mandatory: string[];
    optional: string[];
  } {
    if (!items || items.length === 0) {
      return { mandatory: [], optional: [] };
    }
    
    // These MUST always be present
    const MANDATORY_FIELDS = ["date", "address", "material", "weightKg", "unit", "receiver"];
    
    // These are optional - only show if they have data
    const OPTIONAL_FIELDS = ["wasteCode", "cost", "costSEK", "co2Saved", "co2", "notes", "quantity", "container", "handling", "isHazardous", "percentage", "referensnummer", "fordon", "avfallskod"];
    
    // Check which optional fields actually have data
    const existingOptional = OPTIONAL_FIELDS.filter(field => {
      return items.some(item => {
        const value = item[field];
        if (value && typeof value === 'object' && 'value' in value) {
          const val = value.value;
          return val !== undefined && val !== null && val !== "" && val !== 0 && val !== "0" && val !== false;
        }
        return value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0" && value !== false;
      });
    });
    
    // Also check top-level cost
    if (extractedData.cost?.value) {
      if (!existingOptional.includes("cost") && !existingOptional.includes("costSEK")) {
        existingOptional.push("cost");
      }
    }
    
    
    return {
      mandatory: MANDATORY_FIELDS,
      optional: existingOptional
    };
  }

  const { mandatory, optional } = detectExistingColumns(lineItems);
  // Filter columns based on user's industry (hide waste-specific fields for non-waste users)
  const filteredMandatory = mandatory.filter(col => !hiddenFields.includes(col));
  const filteredOptional = optional.filter(col => !hiddenFields.includes(col));
  const allColumns = [...filteredMandatory, ...filteredOptional];

  // Check if columns exist for display (after filtering)
  const hasCost = filteredOptional.includes("cost") || filteredOptional.includes("costSEK") || extractedData.cost?.value;
  const hasCo2 = filteredOptional.includes("co2Saved") || filteredOptional.includes("co2");

  // Primary key validation (Adress + Mottagare + Material + Datum)
  const primaryKeys = new Map<string, number[]>();
  lineItems.forEach((item: any, index: number) => {
    const address = getValue(item.address) || getValue(item.location) || getValue(extractedData.address) || "";
    const receiver = getValue(item.receiver) || getValue(extractedData.receiver) || "";
    const material = getValue(item.material) || "";
    const date = getValue(extractedData.date) || "";
    const key = `${address}|${receiver}|${material}|${date}`;
    
    if (!primaryKeys.has(key)) {
      primaryKeys.set(key, []);
    }
    primaryKeys.get(key)!.push(index + 1);
  });

  const duplicateKeys = Array.from(primaryKeys.entries())
    .filter(([_, indices]) => indices.length > 1)
    .map(([key, indices]) => ({ key, indices }));

  // Validation issues - now using export preview data (with fallbacks applied)
  const validation = extractedData._validation || { completeness: 100, issues: [] };
  const issues = [...(validation.issues || [])];
  
  // Check for missing mandatory fields in EXPORT data (after fallbacks)
  exportPreviewRows.forEach((row: any) => {
    if (!row.material || row.material === "Okänt material") {
      issues.push(`KRITISKT: Rad ${row.rowNum} saknar Material`);
    }
    if (!row.weightKg || Number(row.weightKg) === 0) {
      issues.push(`KRITISKT: Rad ${row.rowNum} saknar Vikt`);
    }
    if (!row.location || row.location === "SAKNAS" || String(row.location).trim() === "") {
      issues.push(`VARNING: Rad ${row.rowNum} saknar Adress (använder dokumentnivå: "${docAddress || 'tom'}")`);
    }
    if (!row.receiver || row.receiver === "Okänd mottagare") {
      issues.push(`VARNING: Rad ${row.rowNum} saknar Mottagare (använder fallback: "Okänd mottagare")`);
    }
  });

  // Add duplicate key warnings
  duplicateKeys.forEach(({ indices }) => {
    issues.push(`VARNING: Rad ${indices.join(", ")}: Duplicerad primärnyckel`);
  });

  // Generate AI summary
  const hasCriticalIssues = issues.some((issue: string) => issue.includes("KRITISKT"));
  const aiSummary = hasCriticalIssues
    ? `Dokument med ${lineItems.length} rader från ${uniqueAddresses} adresser till ${uniqueReceivers} mottagare. ${issues.filter((i: string) => i.includes("KRITISKT")).length} kritiska problem måste åtgärdas.`
    : `Dokument med ${lineItems.length} rader från ${uniqueAddresses} adresser till ${uniqueReceivers} mottagare (${Array.from(new Set(lineItems.map((i: any) => getValue(i.receiver) || getValue(extractedData.receiver) || '').filter(Boolean))).join(", ")}). All obligatorisk data komplett.`;

  // Parse issues to find rows to highlight
  const highlightedRows = new Set<number>();
  issues.forEach(issue => {
    const match = issue.match(/Rad (\d+)/);
    if (match && match[1]) {
      // Row numbers in issues are 1-based, convert to 0-based index
      highlightedRows.add(parseInt(match[1]) - 1);
    }
  });

  // Quality score for the ring
  const qualityScore = validation.completeness || 0;
  const qualityColor = qualityScore >= 80 ? 'text-emerald-500' : qualityScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const qualityLabel = qualityScore >= 80 ? 'Hög kvalitet' : qualityScore >= 50 ? 'Medel kvalitet' : 'Låg kvalitet';
  const ringDashoffset = 175.9 - (175.9 * qualityScore / 100);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Premium Top Nav */}
      <nav className="nav-premium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">S</div>
                <span className="font-bold text-xl tracking-tight text-slate-900">Solvix.AI</span>
              </Link>
              <div className="hidden md:flex h-full items-center gap-6">
                <Link href="/dashboard" className="nav-link nav-link-active pt-0.5">Dokument</Link>
                <Link href="/health" className="nav-link pt-0.5">Rapporter</Link>
                <Link href="/settings" className="nav-link pt-0.5">Inställningar</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="badge-pro">Pro</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sub-header: Breadcrumbs + Actions */}
      <div className="bg-[#f8f9fa] border-b border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Dokument</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">{truncateFilename(doc.filename, 40)}</span>
          </div>
          <div className="flex items-center gap-3">
            <ReverifyButton docId={doc.id} />
            {doc.status !== 'exported' && (
              <DeleteDocumentButton
                documentId={doc.id}
                storagePath={doc.storage_path}
                filename={doc.filename}
                redirectAfter="/dashboard"
                variant="button"
              />
            )}
            {nextDocId && (
              <Link
                href={`/review/${nextDocId}`}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all shadow-sm font-medium"
              >
                Nästa dokument
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Document Header Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight" title={doc.filename}>
                {truncateFilename(doc.filename, 50)}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                doc.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                doc.status === 'needs_review' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                doc.status === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {doc.status === 'approved' ? 'GODKÄND' :
                 doc.status === 'needs_review' ? 'BEHÖVER GRANSKNING' :
                 doc.status === 'error' ? 'FEL' :
                 doc.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {strings.reviewDescription}
            </p>
          </div>
          {/* Quality Ring */}
          <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">Datakvalitet</div>
              <div className={`text-xs font-medium ${qualityColor}`}>{qualityLabel}</div>
            </div>
            <div className="quality-ring">
              <svg>
                <circle cx="32" cy="32" r="28" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="6"
                  strokeDasharray="175.9" strokeDashoffset={ringDashoffset} strokeLinecap="round"
                  className={qualityColor} />
              </svg>
              <div className="quality-ring-value text-slate-900">{qualityScore.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* DUPLICATE WARNING */}
        {doc.is_duplicate && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-orange-900">Möjlig dubblett identifierad</p>
              <p className="text-sm text-orange-700">
                Detta dokument liknar ett som redan finns i systemet.
                {doc.duplicate_of && (
                  <Link href={`/review/${doc.duplicate_of}`} className="ml-1 underline">
                    Visa originalet →
                  </Link>
                )}
              </p>
            </div>
          </div>
        )}

        {/* CONFIDENCE SUMMARY BANNER */}
        {(() => {
          // Calculate confidence summary from line items
          let totalFields = 0;
          let highConfidence = 0;
          let mediumConfidence = 0;
          let lowConfidence = 0;
          
          const checkConf = (field: any) => {
            if (!field || typeof field !== 'object' || !('confidence' in field)) return;
            totalFields++;
            const conf = field.confidence;
            if (conf >= 0.9) highConfidence++;
            else if (conf >= 0.6) mediumConfidence++;
            else lowConfidence++;
          };
          
          // Check document-level fields
          checkConf(extractedData.date);
          checkConf(extractedData.supplier);
          checkConf(extractedData.address);
          checkConf(extractedData.receiver);
          checkConf(extractedData.material);
          checkConf(extractedData.weightKg);
          checkConf(extractedData.cost);
          
          // Check line item fields
          if (Array.isArray(lineItems)) {
            for (const item of lineItems) {
              checkConf(item.material);
              checkConf(item.weightKg);
              checkConf(item.address);
              checkConf(item.receiver);
            }
          }
          
          if (totalFields === 0) return null;
          
          return (
            <div className={`mb-6 p-4 rounded-xl border ${
              lowConfidence > 0 
                ? 'bg-rose-50 border-rose-200' 
                : mediumConfidence > 0 
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {lowConfidence > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : mediumConfidence > 0 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">
                      {lowConfidence > 0 
                        ? `${lowConfidence} fält behöver granskas`
                        : mediumConfidence > 0
                          ? `${mediumConfidence} fält har medelhög säkerhet`
                          : 'Alla fält har hög säkerhet'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {highConfidence} säkra · {mediumConfidence} osäkra · {lowConfidence} behöver granskning
                    </p>
                  </div>
                </div>
                {lowConfidence === 0 && mediumConfidence === 0 && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    Redo att godkänna
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* AI SUMMARY */}
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          !hasCriticalIssues 
            ? 'bg-emerald-50/50 border-emerald-100' 
            : 'bg-amber-50/50 border-amber-100'
        }`}>
          <div className={`p-1.5 rounded-md ${!hasCriticalIssues ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {!hasCriticalIssues ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${!hasCriticalIssues ? 'text-emerald-900' : 'text-amber-900'}`}>AI Insikt</h3>
            <p className={`text-sm mt-1 ${!hasCriticalIssues ? 'text-emerald-700' : 'text-amber-700'}`}>{aiSummary}</p>
          </div>
        </div>

        {/* EXTRACTION PIPELINE */}
        {doc.extraction_run_id && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
             <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Bearbetningshistorik</h2>
             <ExtractionRunViewer runId={doc.extraction_run_id} />
          </div>
        )}

        {/* DOCUMENT METADATA */}
        {extractedData.documentMetadata && (
          <div className="mb-6 bg-[var(--color-info-bg)] border border-[var(--color-info-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--color-info-text)] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dokumentinformation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {extractedData.documentMetadata.date && (
                <div>
                  <label className="text-sm font-medium text-[var(--color-info-text)] opacity-80 block mb-1">Datum</label>
                  <div className="text-[var(--color-text-primary)] font-medium">
                    {extractedData.documentMetadata.date}
                  </div>
                </div>
              )}
              {extractedData.documentMetadata.supplier && (
                <div>
                  <label className="text-sm font-medium text-[var(--color-info-text)] opacity-80 block mb-1">Leverantör</label>
                  <div className="text-[var(--color-text-primary)] font-medium">
                    {extractedData.documentMetadata.supplier}
                  </div>
                </div>
              )}
              {extractedData.documentMetadata.address && (
                <div>
                  <label className="text-sm font-medium text-[var(--color-info-text)] opacity-80 block mb-1">Projektadress</label>
                  <div className="text-[var(--color-text-primary)] font-medium">
                    {extractedData.documentMetadata.address}
                  </div>
                </div>
              )}
              {extractedData.documentMetadata.receiver && (
                <div>
                  <label className="text-sm font-medium text-[var(--color-info-text)] opacity-80 block mb-1">Mottagare</label>
                  <div className="text-[var(--color-text-primary)] font-medium">
                    {extractedData.documentMetadata.receiver}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENT STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-xs text-stone-600 mb-1 uppercase tracking-wide">Rader</div>
            <div className="text-2xl font-bold text-stone-900">{lineItems.length}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-xs text-stone-600 mb-1 uppercase tracking-wide">Adresser</div>
            <div className="text-2xl font-bold text-stone-900">{uniqueAddresses || '—'}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-xs text-stone-600 mb-1 uppercase tracking-wide">Mottagare</div>
            <div className="text-2xl font-bold text-stone-900">{uniqueReceivers || '—'}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-xs text-stone-600 mb-1 uppercase tracking-wide">Material</div>
            <div className="text-2xl font-bold text-stone-900">{uniqueMaterials || '—'}</div>
          </div>
        </div>

        {/* COLUMN LEGEND */}
        <div className="mb-6 p-4 bg-blue-50 border border-indigo-200 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Kolumner ({allColumns.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {filteredMandatory.map(col => (
                  <span 
                    key={col}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full font-medium"
                    title="Obligatorisk kolumn"
                  >
                    {col === "date" ? "Datum" : 
                     col === "address" ? "Adress" :
                     col === "material" ? "Material" :
                     col === "weightKg" ? "Vikt" :
                     col === "unit" ? "Enhet" :
                     col === "receiver" ? "Mottagare" : col}
                  </span>
                ))}
                {filteredOptional.map(col => (
                  <span 
                    key={col}
                    className="px-3 py-1 bg-purple-100 border border-purple-300 text-purple-700 text-sm rounded-full"
                    title="Valfri kolumn (hittades i data)"
                  >
                    {col === "cost" || col === "costSEK" ? "Kostnad" :
                     col === "co2Saved" || col === "co2" ? "CO2" :
                     col === "wasteCode" || col === "avfallskod" ? "Avfallskod" :
                     col === "referensnummer" ? "Referensnummer" :
                     col === "fordon" ? "Fordon" :
                     col === "container" ? "Container" :
                     col === "handling" ? "Hantering" :
                     col === "isHazardous" ? "Farligt Avfall" :
                     col === "percentage" ? "Procent" :
                     col === "notes" ? "Anteckningar" :
                     col === "quantity" ? "Antal" : col} +
                  </span>
                ))}
              </div>
              
              {/* Show which optional columns were NOT found */}
              {["wasteCode", "costSEK", "co2Saved", "notes"].filter(f => !optional.includes(f) && !optional.includes("cost") && !optional.includes("co2")).length > 0 && (
                <div className="mt-3 text-xs text-stone-600">
                  Saknas i detta dokument: {
                    ["wasteCode", "costSEK", "co2Saved", "notes"]
                      .filter(f => !optional.includes(f) && !optional.includes("cost") && !optional.includes("co2"))
                      .map(f => f === "wasteCode" ? "Avfallskod" : f === "costSEK" ? "Kostnad" : f === "co2Saved" ? "CO2" : f === "notes" ? "Anteckningar" : f)
                      .join(", ")
                  }
                </div>
              )}
            </div>
            <div className="text-xs text-blue-700 lg:ml-4">
              <div className="font-semibold mb-1">Legend:</div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 bg-indigo-600 rounded-full"></span>
                <span>Obligatorisk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-purple-100 border border-purple-300 rounded-full"></span>
                <span>Valfri</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY KEY INFO */}
        <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-lg">
          <h3 className="font-semibold text-stone-900 mb-2">
            Primärnyckel
          </h3>
          <p className="text-sm text-stone-700 mb-3">
            Varje unik kombination av <strong>Adress + Mottagare + Material + Datum</strong> är en rad.
          </p>
          <div className="text-xs text-stone-600 space-y-1">
            <div>• Samma material till olika mottagare = olika rader</div>
            <div>• Samma adress med olika material = olika rader</div>
            <div>• Samma allt = EN rad (duplicerad primärnyckel - VARNING!)</div>
          </div>
          {duplicateKeys.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>Varning:</strong> {duplicateKeys.length} duplicerade primärnycklar hittades (rad {duplicateKeys.map(d => d.indices.join(", ")).join(", ")})
            </div>
          )}
        </div>

        {/* Left: Document Preview */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-stone-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Förhandsvisning</h2>
            {previewUrl ? (
              isExcel ? (
                <ExcelViewer url={previewUrl} />
              ) : (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px] rounded border border-stone-200"
                  title="PDF Viewer"
                >
                  <embed
                    src={previewUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[600px] rounded border border-stone-200"
                  />
                  <div className="text-center py-8 text-stone-500">
                    <p>Din webbläsare stödjer inte PDF-förhandsvisning.</p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Öppna PDF i ny flik
                    </a>
                  </div>
                </object>
              )
            ) : (
              <div className="text-center py-8 text-stone-500">
                Förhandsvisning inte tillgänglig
              </div>
            )}
          </div>
        </div>

        {/* TOTALS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="text-sm text-stone-600 mb-1">Total vikt</div>
            <div className="text-2xl font-bold text-stone-900">
              {(totalWeightKg / 1000).toFixed(2)} ton
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {totalWeightKg.toFixed(2)} kg
            </div>
          </div>

          {hasCost && (
            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="text-sm text-stone-600 mb-1">Total kostnad</div>
              <div className="text-2xl font-bold text-stone-900">
                {totalCost.toLocaleString('sv-SE')} SEK
              </div>
            </div>
          )}

          {hasCo2 && (
            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="text-sm text-stone-600 mb-1">Total CO2</div>
              <div className="text-2xl font-bold text-stone-900">
                {totalCo2.toFixed(2)} kg
              </div>
            </div>
          )}

          {!hasCo2 && (
            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="text-sm text-stone-600 mb-1">Fullständighet</div>
              <div className={`text-2xl font-bold ${
                validation.completeness >= 95 ? 'text-emerald-600' :
                validation.completeness >= 80 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {validation.completeness?.toFixed(0) || 100}%
              </div>
            </div>
          )}
        </div>

        {/* VALIDATION ISSUES */}
        {issues.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Valideringsproblem ({issues.length})
            </h3>
            <ul className="space-y-1">
              {issues.map((issue: string, idx: number) => (
                <li 
                  key={idx} 
                  className={`text-sm ${
                    issue.includes('KRITISKT') ? 'text-red-800 font-semibold' : 'text-red-700'
                  }`}
                >
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* RAW EXTRACTED DATA TABLE */}
        {lineItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-stone-900">Extraherad Data (Rådata från AI)</h2>
              <span className="px-3 py-1 bg-stone-100 text-stone-600 text-sm rounded-full">
                {lineItems.length} rader extraherade
              </span>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Rå data som AI:n extraherade. Fält med "SAKNAS" fylls i med fallback-värden vid export.
            </p>
            <PaginatedTable 
              lineItems={lineItems}
              columns={allColumns}
              highlightedRows={Array.from(highlightedRows)}
            />
          </div>
        )}

        {/* Invoice-specific fields — shown when document type is invoice */}
        {extractedData?.documentType === 'invoice' && (
          <div className="mb-6 p-6 bg-white rounded-lg border border-stone-200 space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Fakturadetaljer
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Fakturanummer:</span> <span className="font-medium">{getValue(extractedData.invoiceNumber) || '—'}</span></div>
              <div><span className="text-slate-500">Fakturadatum:</span> <span className="font-medium">{getValue(extractedData.invoiceDate) || '—'}</span></div>
              <div><span className="text-slate-500">Förfallodatum:</span> <span className="font-medium">{getValue(extractedData.dueDate) || '—'}</span></div>
              <div><span className="text-slate-500">OCR-referens:</span> <span className="font-medium">{getValue(extractedData.ocrReference) || '—'}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Leverantör:</span> <span className="font-medium">{getValue(extractedData.supplier) || '—'}</span></div>
              <div><span className="text-slate-500">Org.nr (leverantör):</span> <span className="font-medium">{getValue(extractedData.supplierOrgNr) || '—'}</span></div>
              <div><span className="text-slate-500">Köpare:</span> <span className="font-medium">{getValue(extractedData.buyerName) || '—'}</span></div>
              <div><span className="text-slate-500">Org.nr (köpare):</span> <span className="font-medium">{getValue(extractedData.buyerOrgNr) || '—'}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Bankgiro:</span> <span className="font-medium">{getValue(extractedData.bankgiro) || '—'}</span></div>
              <div><span className="text-slate-500">Plusgiro:</span> <span className="font-medium">{getValue(extractedData.plusgiro) || '—'}</span></div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">Summa exkl. moms:</span> <span className="font-medium">{typeof getValue(extractedData.subtotal) === 'number' ? `${getValue(extractedData.subtotal).toLocaleString('sv-SE')} kr` : '—'}</span></div>
              <div><span className="text-slate-500">Moms:</span> <span className="font-medium">{typeof getValue(extractedData.vatAmount) === 'number' ? `${getValue(extractedData.vatAmount).toLocaleString('sv-SE')} kr` : '—'}</span></div>
              <div><span className="text-slate-500">Att betala:</span> <span className="font-bold text-slate-900">{typeof getValue(extractedData.totalAmount) === 'number' ? `${getValue(extractedData.totalAmount).toLocaleString('sv-SE')} kr` : '—'}</span></div>
            </div>

            {/* Invoice line items table */}
            {Array.isArray(extractedData.invoiceLineItems) && extractedData.invoiceLineItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Fakturarader</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-600">Beskrivning</th>
                        <th className="px-3 py-2 text-right text-slate-600">Antal</th>
                        <th className="px-3 py-2 text-right text-slate-600">Á-pris</th>
                        <th className="px-3 py-2 text-right text-slate-600">Belopp</th>
                        <th className="px-3 py-2 text-right text-slate-600">Moms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedData.invoiceLineItems.map((item: any, i: number) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2">{String(getValue(item.description) || '')}</td>
                          <td className="px-3 py-2 text-right">{String(getValue(item.quantity) ?? '')}</td>
                          <td className="px-3 py-2 text-right">
                            {typeof getValue(item.unitPrice) === 'number'
                              ? getValue(item.unitPrice).toFixed(2).replace('.', ',')
                              : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {typeof getValue(item.amount) === 'number'
                              ? getValue(item.amount).toFixed(2).replace('.', ',')
                              : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {getValue(item.vatRate) ? `${getValue(item.vatRate)}%` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-medium">
                      <tr className="border-t border-slate-200">
                        <td colSpan={3} className="px-3 py-2 text-right">Summa:</td>
                        <td className="px-3 py-2 text-right">
                          {typeof getValue(extractedData.totalAmount) === 'number'
                            ? `${getValue(extractedData.totalAmount).toFixed(2).replace('.', ',')} kr`
                            : ''}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: Review Form */}
        <div className="mb-6">
          <ReviewForm
            initialData={extractedData}
            documentId={doc.id}
            nextDocId={nextDocId}
          />
        </div>

        {/* SWEDISH METADATA */}
        {extractedData.swedishMetadata && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              Svenska format identifierade
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Array.isArray(extractedData.swedishMetadata.orgNr) && extractedData.swedishMetadata.orgNr.map((nr: string) => (
                <div key={nr} className="text-blue-700">
                  <span className="text-blue-400">Org.nr:</span> {nr}
                </div>
              ))}
              {Array.isArray(extractedData.swedishMetadata.plusgiro) && extractedData.swedishMetadata.plusgiro.map((pg: string) => (
                <div key={pg} className="text-blue-700">
                  <span className="text-blue-400">Plusgiro:</span> {pg}
                </div>
              ))}
              {Array.isArray(extractedData.swedishMetadata.bankgiro) && extractedData.swedishMetadata.bankgiro.map((bg: string) => (
                <div key={bg} className="text-blue-700">
                  <span className="text-blue-400">Bankgiro:</span> {bg}
                </div>
              ))}
              {Array.isArray(extractedData.swedishMetadata.ocrReferences) && extractedData.swedishMetadata.ocrReferences.map((ocr: string) => (
                <div key={ocr} className="text-blue-700">
                  <span className="text-blue-400">OCR:</span> {ocr}
                </div>
              ))}
              {extractedData.swedishMetadata.vatRate && (
                <div className="text-blue-700">
                  <span className="text-blue-400">Moms:</span> {extractedData.swedishMetadata.vatRate}%
                </div>
              )}
              {extractedData.swedishMetadata.vatAmount && (
                <div className="text-blue-700">
                  <span className="text-blue-400">Momsbelopp:</span> {extractedData.swedishMetadata.vatAmount.toLocaleString('sv-SE')} kr
                </div>
              )}
            </div>
          </div>
        )}

        {/* === EXPORT PREVIEW === */}
        {/* Shows EXACTLY what will be in the Excel file uploaded to Azure */}
        {exportPreviewRows.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-stone-900">
                Förhandsgranskning av Export
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                {exportPreviewRows.length} rader → Excel
              </span>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Detta är exakt vad som kommer att exporteras till Excel-filen i Azure. 
              Fallback-värden från dokumentnivå har applicerats där data saknas.
            </p>
            
            <div className="bg-white rounded-lg border-2 border-emerald-200 overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <span className="text-sm font-medium text-green-800">
                  Standard Excel-format
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Utförtdatum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Hämtställe</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Kvantitet</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Enhet</th>
                      {!hiddenFields.includes('receiver') && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Leveransställe</th>
                      )}
                      {!hiddenFields.includes('isHazardous') && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Farligt avfall</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {exportPreviewRows.map((row: any) => (
                      <tr key={row.rowNum} className="hover:bg-emerald-50">
                        <td className="px-4 py-3 text-sm text-stone-500">{row.rowNum}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-sm">{row.location || <span className="text-stone-400">-</span>}</td>
                        <td className="px-4 py-3 text-sm">{row.material}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {row.weightKg.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm">{row.unit}</td>
                        {!hiddenFields.includes('receiver') && (
                          <td className="px-4 py-3 text-sm">{row.receiver}</td>
                        )}
                        {!hiddenFields.includes('isHazardous') && (
                          <td className="px-4 py-3 text-sm">
                            {row.isHazardous ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Ja</span>
                            ) : (
                              <span className="text-stone-500">Nej</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Summary of fallbacks applied */}
            <div className="mt-3 p-3 bg-blue-50 border border-indigo-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Fallback-värden (dokumentnivå):</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Datum:</span>{' '}
                  <span className="text-stone-900">{docDate}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Adress:</span>{' '}
                  <span className="text-stone-900">{docAddress || <span className="text-stone-400">-</span>}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Mottagare:</span>{' '}
                  <span className="text-stone-900">{docReceiver || "Okänd mottagare"}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Leverantör:</span>{' '}
                  <span className="text-stone-900">{docSupplier || <span className="text-stone-400">-</span>}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail Section */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Händelselogg
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-4 space-y-2">
              {(auditLog || []).map((entry: any) => (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    entry.action?.includes('approved') ? 'bg-emerald-500' :
                    entry.action?.includes('error') || entry.action?.includes('rejected') ? 'bg-rose-500' :
                    entry.action?.includes('edited') ? 'bg-amber-500' :
                    entry.action?.includes('duplicate') ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{entry.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleString('sv-SE')}
                    </p>
                  </div>
                </div>
              ))}
              {(!auditLog || auditLog.length === 0) && (
                <p className="text-sm text-slate-400 py-2">Inga händelser registrerade</p>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
