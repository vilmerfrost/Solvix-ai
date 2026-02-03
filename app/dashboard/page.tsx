import { createServiceRoleClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { FileText, CheckCircle2, AlertCircle, Activity, RefreshCw, ArrowLeft, Download, Settings, Home, Upload, FileSpreadsheet } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { AutoFetchButton } from "@/components/auto-fetch-button";
import { ResetDocumentsButton } from "@/components/reset-documents-button";
import { BatchProcessButton } from "@/components/batch-process-button";
import { GranskaButton } from "@/components/granska-button";
import { ExportToAzureButton } from "@/components/export-to-azure-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getDashboardBreadcrumbs } from "@/lib/breadcrumb-utils";
import { FilterSection } from "@/components/filter-section";
import { UndoExportButton } from "@/components/undo-export-button";
import { formatDate, formatDateTime } from "@/lib/time-utils";
import { RelativeTime } from "@/components/relative-time";
import { truncateFilename } from "@/lib/filename-utils";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { Pagination } from "@/components/pagination";
import { getTenantConfigFromDB, getUIStrings } from "@/config/tenant";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
    searchParams: Promise<{ tab?: string; page?: string; perPage?: string; status?: string; type?: string }>;
}) {
  // Get authenticated user
  const user = await requireAuth();
  const userId = user.id;
  
  const supabase = createServiceRoleClient();
  const params = await searchParams;
  const activeTab = params.tab || "active";
  const statusFilter = params.status;
  
  // Get tenant configuration
  const config = await getTenantConfigFromDB();
  const strings = getUIStrings(config);
  
  // Pagination params
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const itemsPerPage = Math.min(50, Math.max(10, parseInt(params.perPage || "10", 10)));

  // Fetch documents - filter by user_id and tab
  let documentsQuery = supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Filter: Active tab shows non-exported, Archive tab shows exported
  if (activeTab === "archive") {
    documentsQuery = documentsQuery.not("exported_at", "is", null);
  } else {
    documentsQuery = documentsQuery.is("exported_at", null);
  }

  const { data: documents } = await documentsQuery;

  // Filter documents by type if specified
  const fileType = params.type; // 'pdf' or 'excel'
  
  let filteredDocuments = documents || [];
  if (fileType === 'pdf') {
    filteredDocuments = filteredDocuments.filter(d => !d.filename?.toLowerCase().endsWith('.xlsx') && !d.filename?.toLowerCase().endsWith('.xls'));
  } else if (fileType === 'excel') {
    filteredDocuments = filteredDocuments.filter(d => d.filename?.toLowerCase().endsWith('.xlsx') || d.filename?.toLowerCase().endsWith('.xls'));
  }

  // Use filteredDocuments for stats and lists (except for "Recent Documents" logic which slices)
  // Actually, let's just use filteredDocuments as the source of truth for "documents" in subsequent logic if we want stats to reflect filter?
  // The UI usually filters LISTS but stats might remain total?
  // The plan says "Implement the filtering logic... to show/hide items".
  // Let's filter the LISTS.

  // Fetch paginated needs_review documents separately (only for active tab)
  let needsReviewDocs: any[] = [];
  let needsReviewTotal = 0;
  
  if (activeTab === "active") {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;
    
    // Base query for counts
    let countQuery = supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "needs_review");
      
    // Apply file type filter to count query if possible?
    // Supabase doesn't easily support "ends with" for multiple extensions in one go without complex OR.
    // Simpler to filter in memory if dataset is small, or just accept that count might be off for file types?
    // Let's rely on the fallback "needsReviewFromMain" which we can filter.
    
    // Get total count (unfiltered by type for now, we'll fix with fallback)
    const { count } = await countQuery;
    
    needsReviewTotal = count || 0;
    
    // FALLBACK: Also check the main documents array in case count query missed some
    // AND apply file type filter here
    let needsReviewFromMain = filteredDocuments.filter(d => d.status === "needs_review");
    
    // If we have a file type filter, we MUST use the filtered list count
    if (fileType) {
        needsReviewTotal = needsReviewFromMain.length;
    } else if (needsReviewTotal === 0 && needsReviewFromMain.length > 0) {
      needsReviewTotal = needsReviewFromMain.length;
    }
    
    // Get paginated data
    // If filtering by file type, we can't easily paginate via DB efficiently without complex queries.
    // For now, let's use the in-memory filtered list for pagination if fileType is active.
    
    if (fileType) {
        needsReviewDocs = needsReviewFromMain.slice(startIndex, endIndex + 1);
    } else {
        const { data: paginatedNeedsReview } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "needs_review")
        .order("created_at", { ascending: true })
        .range(startIndex, endIndex);
        
        needsReviewDocs = paginatedNeedsReview || [];
        
        // FALLBACK
        if (needsReviewDocs.length === 0 && needsReviewFromMain.length > 0) {
        needsReviewDocs = needsReviewFromMain.slice(startIndex, endIndex + 1);
        }
    }
  }

  // Filter documents by status (only for active tab) - derived from filteredDocuments
  const uploadedDocs = activeTab === "active" 
    ? filteredDocuments.filter(d => d.status === "uploaded")
    : [];
  const processingDocs = activeTab === "active"
    ? filteredDocuments.filter(d => d.status === "processing")
    : [];
  const approvedDocs = activeTab === "active"
    ? filteredDocuments.filter(d => d.status === "approved")
    : [];
  const failedDocs = activeTab === "active"
    ? filteredDocuments.filter(d => d.status === "error")
    : [];
  const exportedDocs = activeTab === "archive"
    ? filteredDocuments.filter(d => d.status === "exported")
    : [];

  const stats = {
    total: activeTab === "active" 
      ? (filteredDocuments.filter(d => !d.exported_at).length || 0)
      : (filteredDocuments.filter(d => d.exported_at).length || 0),
    uploaded: uploadedDocs.length,
    processing: processingDocs.length,
    needsReview: activeTab === "active" ? needsReviewTotal : 0,
    approved: approvedDocs.length,
    failed: failedDocs.length,
    exported: exportedDocs.length,
  };

  // Show documents based on active tab (max 10 for cleaner look)
  let recentDocs = activeTab === "archive"
    ? exportedDocs
    : filteredDocuments;

  if (statusFilter) {
    recentDocs = recentDocs.filter(d => d.status === statusFilter);
    // If filtering by needs_review, DO NOT show them in recent list if they are already in the top section
    if (statusFilter === 'needs_review' && activeTab === 'active') {
       // Actually, the user might want to see them in list view too?
       // But the plan says "Quick Filter Fix".
       // Let's keep them for now but maybe limit them?
    }
  } else if (activeTab === "active") {
    // By default, exclude needs_review from recent list as they have their own section
    recentDocs = recentDocs.filter(d => d.status !== 'needs_review');
  }

  // FIX: If we are filtering by 'needs_review', we essentially show the same docs in "Needs Review" section AND "Recent Documents".
  // This is redundant.
  // If statusFilter is 'needs_review', we should probably hide the "Recent documents" section or the "Needs Review" section?
  // The "Needs Review" section is specialized cards. The "Recent" is a table/list.
  // Let's keeping both but maybe ensure the "Recent" list is clear.
  
  recentDocs = recentDocs.slice(0, 10);

  // Calculate quality metrics
  const avgCompleteness = documents && documents.length > 0
    ? documents
        .filter(d => d.extracted_data?._validation?.completeness)
        .reduce((sum, d) => sum + (d.extracted_data._validation.completeness || 0), 0) / 
        documents.filter(d => d.extracted_data?._validation?.completeness).length
    : 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header - Clean and Professional */}
      <div className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumbs */}
          <Breadcrumbs items={getDashboardBreadcrumbs()} className="mb-4" />
          
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Back button */}
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{strings.back}</span>
            </Link>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-3">
              {activeTab === "active" && approvedDocs.length > 0 && (
                <ExportToAzureButton 
                  selectedDocuments={approvedDocs.map(d => d.id)}
                />
              )}
              
              <Link
                href="/health"
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] transition-all text-sm font-medium"
              >
                <Activity className="w-4 h-4" />
                <span>{strings.health}</span>
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] transition-all text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                <span>{strings.settings}</span>
              </Link>

              <ResetDocumentsButton />
              <AutoFetchButton />
            </div>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse" />
            <span className="text-xs font-medium text-[var(--color-success-text)] uppercase tracking-wider">
              {strings.systemOnline}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            {config.companyName} {strings.review}
          </h1>
          <p className="text-lg text-[var(--color-accent)] font-medium mb-2">
            {strings.dashboard}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {strings.reviewDescription}
          </p>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[var(--color-border)] mt-6 items-center justify-between">
            <div className="flex gap-2">
              <a
                href={`/dashboard?tab=active${params.type ? `&type=${params.type}` : ''}`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "active" || !activeTab
                    ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {strings.active} ({activeTab === "active" ? stats.total : (documents?.filter(d => !d.exported_at).length || 0)})
              </a>
              <a
                href={`/dashboard?tab=archive${params.type ? `&type=${params.type}` : ''}`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "archive"
                    ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {strings.archived} ({activeTab === "archive" ? stats.total : (documents?.filter(d => d.exported_at).length || 0)})
              </a>
            </div>
            
            {/* File Type Filters */}
            <div className="flex items-center gap-1 mb-1">
               <Link
                 href={`/dashboard?tab=${activeTab}${statusFilter ? `&status=${statusFilter}` : ''}`}
                 className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                   !params.type 
                     ? 'bg-stone-100 text-stone-900 border border-stone-200' 
                     : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                 }`}
               >
                 All
               </Link>
               <Link
                 href={`/dashboard?tab=${activeTab}&type=pdf${statusFilter ? `&status=${statusFilter}` : ''}`}
                 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                   params.type === 'pdf' 
                     ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                     : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                 }`}
               >
                 <FileText className="w-3.5 h-3.5" />
                 PDF
               </Link>
               <Link
                 href={`/dashboard?tab=${activeTab}&type=excel${statusFilter ? `&status=${statusFilter}` : ''}`}
                 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                   params.type === 'excel' 
                     ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                     : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                 }`}
               >
                 <FileSpreadsheet className="w-3.5 h-3.5" />
                 Excel
               </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Batch Processing UI */}
        {uploadedDocs.length > 0 && (
          <BatchProcessButton uploadedDocs={uploadedDocs} />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total */}
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)] p-6 hover:border-[var(--color-border-strong)] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                {strings.total.toUpperCase()}
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)]" />
            </div>
            <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats.total}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">{strings.documents}</p>
          </div>

          {/* Needs Review - Clickable */}
          <a 
            href="#needs-review-section"
            className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-warning-border)] p-6 hover:shadow-[var(--shadow-md)] hover:border-[var(--color-warning)] transition-all cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                {strings.needsReview.toUpperCase()}
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)]" />
            </div>
            <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats.needsReview}
            </div>
            <p className="text-xs text-[var(--color-warning-text)] font-medium">
              {config.language === 'sv' ? 'Väntar - Klicka för att visa' : 
               config.language === 'en' ? 'Waiting - Click to view' :
               config.language === 'no' ? 'Venter - Klikk for å vise' :
               'Odottaa - Klikkaa nähdäksesi'}
            </p>
          </a>

          {/* Approved */}
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-success-border)] p-6 hover:border-[var(--color-success)] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                {strings.approved.toUpperCase()}
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" />
            </div>
            <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats.approved}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {activeTab === "active" 
                ? (config.language === 'sv' ? 'Redo för export' : 
                   config.language === 'en' ? 'Ready for export' :
                   config.language === 'no' ? 'Klar for eksport' :
                   'Valmis vientiin')
                : strings.exported}
            </p>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-lg border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-600 uppercase tracking-wide">
                {strings.error.toUpperCase()}
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <div className="text-4xl font-bold text-stone-900 mb-1">
              {stats.failed}
            </div>
            <p className="text-xs text-red-600 font-medium">
              {config.language === 'sv' ? 'Kräver åtgärd' : 
               config.language === 'en' ? 'Requires action' :
               config.language === 'no' ? 'Krever handling' :
               'Vaatii toimenpiteitä'}
            </p>
          </div>
        </div>

        {/* PRIORITY: Documents Needing Review - SHOW FIRST */}
        {activeTab === "active" && (!statusFilter || statusFilter === 'needs_review') && (
          <div id="needs-review-section" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                {strings.needsReview}
              </h2>
              <p className="text-sm text-stone-500">
                {needsReviewTotal} {strings.documents.toLowerCase()} {config.language === 'sv' ? 'väntar' : config.language === 'en' ? 'waiting' : config.language === 'no' ? 'venter' : 'odottaa'}
              </p>
            </div>

            {needsReviewDocs.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-dashed border-yellow-300 p-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  {config.language === 'sv' ? 'Inga dokument behöver granskning' : 
                   config.language === 'en' ? 'No documents need review' :
                   config.language === 'no' ? 'Ingen dokumenter trenger gjennomgang' :
                   'Ei tarkistettavia asiakirjoja'}
                </h3>
                <p className="text-stone-600">
                  {config.language === 'sv' ? 'Alla dokument är granskade eller väntar på bearbetning.' : 
                   config.language === 'en' ? 'All documents are reviewed or awaiting processing.' :
                   config.language === 'no' ? 'Alle dokumenter er gjennomgått eller venter på behandling.' :
                   'Kaikki asiakirjat on tarkistettu tai odottavat käsittelyä.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {needsReviewDocs.map((doc) => {
                const validation = doc.extracted_data?._validation;
                const completeness = validation?.completeness || 100;
                const materialCount = doc.extracted_data?.lineItems?.length || doc.extracted_data?.rows?.length || 0;
                const totalWeight = doc.extracted_data?.totalWeightKg || 
                  (doc.extracted_data?.lineItems?.reduce((sum: number, item: any) => 
                    sum + (item.weightKg || 0), 0) || 0);

                const isExcel = doc.filename?.toLowerCase().endsWith('.xlsx') || doc.filename?.toLowerCase().endsWith('.xls');
                const FileIcon = isExcel ? FileSpreadsheet : FileText;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border-2 border-yellow-300 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5 border-b border-yellow-100 bg-yellow-50">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <FileIcon className="w-5 h-5 text-yellow-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-medium text-stone-900 text-sm truncate mb-1"
                            title={doc.filename}
                          >
                            {truncateFilename(doc.filename, 30)}
                          </h3>
                          <p className="text-xs text-stone-500" title={formatDate(doc.created_at)}>
                            <RelativeTime date={doc.created_at} />
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{strings.material}:</span>
                        <span className="font-medium text-stone-900">{materialCount} {config.language === 'sv' ? 'rader' : config.language === 'en' ? 'rows' : config.language === 'no' ? 'rader' : 'riviä'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{config.language === 'sv' ? 'Total vikt' : config.language === 'en' ? 'Total weight' : config.language === 'no' ? 'Total vekt' : 'Kokonaispaino'}:</span>
                        <span className="font-medium text-stone-900">
                          {totalWeight > 0 ? `${(totalWeight / 1000).toFixed(1)} ton` : '0 kg'}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-stone-600">{strings.completeness}:</span>
                          <span className={`font-medium ${
                            completeness >= 95 ? 'text-emerald-600' :
                            completeness >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {completeness.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              completeness >= 95 ? 'bg-emerald-500' :
                              completeness >= 80 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(completeness, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Link
                        href={`/review/${doc.id}`}
                        className="block w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-orange-300 hover:shadow-sm text-stone-700 hover:text-orange-700 text-sm font-medium rounded-lg transition-all text-center"
                      >
                        {config.language === 'sv' ? 'Granska nu' : 
                         config.language === 'en' ? 'Review now' :
                         config.language === 'no' ? 'Gjennomgå nå' :
                         'Tarkista nyt'}
                      </Link>
                    </div>
                  </div>
                );
                  })}
                </div>
                
                {/* Pagination */}
                {needsReviewTotal >= itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(needsReviewTotal / itemsPerPage)}
                    totalItems={needsReviewTotal}
                    itemsPerPage={itemsPerPage}
                    onPageSizeChange={() => {}}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-stone-700">
                {config.language === 'sv' ? 'Snabbfilter:' : 'Quick filter:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard?tab=active"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'active' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {config.language === 'sv' ? 'Alla aktiva' : 'All active'} ({stats.total})
                </Link>
                <Link
                  href="/dashboard?status=needs_review"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                >
                  {config.language === 'sv' ? 'Granska' : 'Review'} ({stats.needsReview})
                </Link>
                <Link
                  href="/dashboard?status=approved"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                >
                  {config.language === 'sv' ? 'Godkända' : 'Approved'} ({stats.approved})
                </Link>
                <Link
                  href="/dashboard?status=error"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                >
                  {config.language === 'sv' ? 'Fel' : 'Failed'} ({stats.failed})
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Senaste Dokument Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-900">
              {config.language === 'sv' ? 'Senaste dokument' : 
               config.language === 'en' ? 'Recent documents' :
               config.language === 'no' ? 'Nylige dokumenter' :
               'Viimeisimmät asiakirjat'}
            </h2>
            <p className="text-sm text-stone-500">
              {config.language === 'sv' ? `Visar ${recentDocs.length} av ${stats.total} dokument` : 
               config.language === 'en' ? `Showing ${recentDocs.length} of ${stats.total} documents` :
               config.language === 'no' ? `Viser ${recentDocs.length} av ${stats.total} dokumenter` :
               `Näytetään ${recentDocs.length} / ${stats.total} asiakirjaa`}
            </p>
          </div>

          {recentDocs.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-stone-300 p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <FileText className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-2">
                {activeTab === "archive" 
                  ? (config.language === 'sv' ? 'Inga arkiverade dokument ännu' : 
                     config.language === 'en' ? 'No archived documents yet' :
                     config.language === 'no' ? 'Ingen arkiverte dokumenter ennå' :
                     'Ei arkistoituja asiakirjoja vielä')
                  : strings.noDocuments}
              </h3>
              <p className="text-stone-600 mb-6">
                {activeTab === "archive"
                  ? (config.language === 'sv' ? 'Exporterade dokument visas här' : 
                     config.language === 'en' ? 'Exported documents will appear here' :
                     config.language === 'no' ? 'Eksporterte dokumenter vises her' :
                     'Viedyt asiakirjat näkyvät täällä')
                  : (config.language === 'sv' ? 'Börja med att synka dokument från Azure' : 
                     config.language === 'en' ? 'Start by syncing documents from Azure' :
                     config.language === 'no' ? 'Start med å synkronisere dokumenter fra Azure' :
                     'Aloita synkronoimalla asiakirjat Azuresta')}
              </p>
              {activeTab === "active" && (
                <div className="flex gap-2 mt-4">
                  <AutoFetchButton />
                  <ResetDocumentsButton />
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentDocs.map((doc) => {
                const validation = doc.extracted_data?._validation;
                const completeness = validation?.completeness || 100;
                const isProcessed = doc.status !== 'uploaded';
                const materialCount = doc.extracted_data?.lineItems?.length || doc.extracted_data?.rows?.length || 0;
                const totalWeight = doc.extracted_data?.totalWeightKg || 
                  (doc.extracted_data?.lineItems?.reduce((sum: number, item: any) => 
                    sum + (item.weightKg || 0), 0) || 0);
                
                // Determine file icon
                const isExcel = doc.filename?.toLowerCase().endsWith('.xlsx') || doc.filename?.toLowerCase().endsWith('.xls');
                const FileIcon = isExcel ? FileSpreadsheet : FileText;
                const iconColorClass = isExcel ? "text-green-600" : "text-stone-600";
                const iconBgClass = isExcel ? "bg-green-50" : "bg-stone-100";

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Document Header */}
                    <div className="p-5 border-b border-stone-100">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center`}>
                            <FileIcon className={`w-5 h-5 ${iconColorClass}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-medium text-stone-900 text-sm truncate mb-1"
                              title={doc.filename}
                            >
                              {truncateFilename(doc.filename, 30)}
                            </h3>
                            <p className="text-xs text-stone-500" title={formatDate(doc.created_at)}>
                              <RelativeTime date={doc.created_at} />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <StatusBadge status={doc.status} showIcon={true} />
                          {/* Delete Button - only show for non-exported documents */}
                          {doc.status !== 'exported' && (
                            <DeleteDocumentButton
                              documentId={doc.id}
                              storagePath={doc.storage_path}
                              filename={doc.filename}
                              variant="icon"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document Stats */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{strings.material}:</span>
                        <span className="font-medium text-stone-900">
                          {isProcessed ? `${materialCount} ${config.language === 'sv' ? 'rader' : config.language === 'en' ? 'rows' : config.language === 'no' ? 'rader' : 'riviä'}` : (config.language === 'sv' ? 'Ej processad' : config.language === 'en' ? 'Not processed' : config.language === 'no' ? 'Ikke behandlet' : 'Ei käsitelty')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{config.language === 'sv' ? 'Total vikt' : config.language === 'en' ? 'Total weight' : config.language === 'no' ? 'Total vekt' : 'Kokonaispaino'}:</span>
                        <span className="font-medium text-stone-900">
                          {isProcessed 
                            ? (totalWeight > 0 ? `${(totalWeight / 1000).toFixed(1)} ton` : '0 kg')
                            : '-'
                          }
                        </span>
                      </div>
                      
                      {/* Completeness Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-stone-600">{strings.completeness}:</span>
                          <span className={`font-medium ${
                            !isProcessed ? 'text-stone-400' :
                            completeness >= 95 ? 'text-emerald-600' :
                            completeness >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {isProcessed ? `${completeness.toFixed(0)}%` : '-'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              !isProcessed ? 'bg-stone-300' :
                              completeness >= 95 ? 'bg-emerald-500' :
                              completeness >= 80 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: isProcessed ? `${completeness}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Validation Warnings */}
                      {validation && validation.issues && validation.issues.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-yellow-800 mb-1">
                                {config.language === 'sv' ? 'Varningar' : 
                                 config.language === 'en' ? 'Warnings' :
                                 config.language === 'no' ? 'Advarsler' :
                                 'Varoitukset'}:
                              </p>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                {validation.issues.slice(0, 2).map((issue: string, idx: number) => (
                                  <li key={idx} className="truncate">• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="p-5 pt-0">
                      {doc.status === 'uploaded' && (
                        <GranskaButton documentId={doc.id} filename={doc.filename} />
                      )}
                      {doc.status === 'processing' && (
                        <div className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg font-medium flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {strings.processing}...
                        </div>
                      )}
                      {doc.status === 'needs_review' && (
                        <div className="space-y-2">
                          <Link
                            href={`/review/${doc.id}`}
                            className="block w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm text-stone-700 hover:text-stone-900 text-sm font-medium rounded-lg transition-all text-center flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            {config.language === 'sv' ? 'Granska nu' : 
                             config.language === 'en' ? 'Review now' :
                             config.language === 'no' ? 'Gjennomgå nå' :
                             'Tarkista nyt'}
                          </Link>
                          <GranskaButton documentId={doc.id} filename={doc.filename} />
                        </div>
                      )}
                      {doc.status === 'approved' && (
                        <div className="space-y-2">
                          <Link
                            href={`/review/${doc.id}`}
                            className="block w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm text-stone-700 hover:text-stone-900 text-sm font-medium rounded-lg transition-all text-center flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {config.language === 'sv' ? 'Se detaljer' : 
                             config.language === 'en' ? 'View details' :
                             config.language === 'no' ? 'Se detaljer' :
                             'Näytä tiedot'}
                          </Link>
                          <GranskaButton documentId={doc.id} filename={doc.filename} />
                        </div>
                      )}
                      {doc.status === 'exported' && (
                        <div className="space-y-2">
                          <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-center">
                            <p className="text-xs text-purple-700 font-medium flex items-center justify-center gap-1">
                              <Upload className="w-3 h-3" />
                              {strings.exported}
                            </p>
                            {doc.exported_at && (
                              <p className="text-xs text-purple-600 mt-1" title={formatDateTime(doc.exported_at)}>
                                <RelativeTime date={doc.exported_at} />
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {doc.extracted_data?.azure_export_url && (
                              <a
                                href={doc.extracted_data.azure_export_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm text-stone-700 hover:text-stone-900 text-sm font-medium rounded-lg transition-all text-center flex items-center justify-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                {config.language === 'sv' ? 'Öppna i Azure' : 
                                 config.language === 'en' ? 'Open in Azure' :
                                 config.language === 'no' ? 'Åpne i Azure' :
                                 'Avaa Azuressa'}
                              </a>
                            )}
                            <UndoExportButton 
                              documentId={doc.id} 
                              filename={doc.filename}
                              variant="icon"
                            />
                          </div>
                        </div>
                      )}
                      {doc.status === 'error' && (
                        <Link
                          href={`/review/${doc.id}`}
                          className="block w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm text-stone-700 hover:text-stone-900 text-sm font-medium rounded-lg transition-all text-center flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          {config.language === 'sv' ? 'Visa fel' : 
                           config.language === 'en' ? 'View error' :
                           config.language === 'no' ? 'Vis feil' :
                           'Näytä virhe'}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
