import { createServiceRoleClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, CheckCircle2, AlertCircle, Activity, RefreshCw, ArrowLeft, Download, Settings, Home, Upload, FileSpreadsheet, Shield, Brain, Bot, LogOut } from "lucide-react";
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
import { createServerComponentClient } from "@/lib/supabase";
import { UploadZone } from "@/components/upload-zone";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
    searchParams: Promise<{ tab?: string; page?: string; perPage?: string; status?: string; type?: string }>;
}) {
  // Get authenticated user
  const user = await requireAuth();
  const userId = user.id;
  
  // CRITICAL: Use createServerComponentClient() instead of createServiceRoleClient()
  // This enforces Row Level Security and ensures users only see their own data
  const supabase = await createServerComponentClient();
  
  // Check if user has completed onboarding + get feature flags
  const { data: userSettings } = await supabase
    .from("settings")
    .select("onboarding_complete, industry, features_enabled")
    .eq("user_id", userId)
    .single();
  
  // Redirect to onboarding if not complete (skip for legacy 'default' user)
  if (userId !== 'default' && (!userSettings?.onboarding_complete || !userSettings?.industry)) {
    redirect("/onboarding");
  }
  
  const userFeatures = (userSettings?.features_enabled as Record<string, boolean>) || {};
  const showAzure = userFeatures.azure_integration ?? false;
  
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

  // Calculate advanced stats for AI Pipeline
  const processedDocsCount = documents?.filter(d => d.status === 'approved' || d.status === 'exported' || d.status === 'needs_review').length || 0;
  
  const verifiedCount = documents?.filter(d => {
    const issues = d.extracted_data?._validation?.issues || [];
    return (d.status === 'approved' || d.status === 'exported' || d.status === 'needs_review') && issues.length === 0;
  }).length || 0;
  
  const verificationRate = processedDocsCount > 0 ? (verifiedCount / processedDocsCount) * 100 : 0;
  
  const totalConfidence = documents?.reduce((sum, d) => {
    let conf = d.extracted_data?._validation?.confidence || (d.extracted_data?._validation?.completeness ? d.extracted_data?._validation?.completeness / 100 : 0);
    // Normalize to 0-1 range if it appears to be 0-100
    if (conf > 1) conf = conf / 100;
    return sum + (conf || 0);
  }, 0) || 0;
  
  const avgConfidence = processedDocsCount > 0 ? Math.min((totalConfidence / processedDocsCount) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Premium Top Nav - Stitch inspired */}
      <nav className="nav-premium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">S</div>
                <span className="font-bold text-xl tracking-tight text-slate-900">Solvix.AI</span>
              </Link>
              {/* Nav links */}
              <div className="hidden md:flex h-full items-center gap-6">
                <a href="/dashboard" className="nav-link nav-link-active pt-0.5">Dokument</a>
                <a href="/health" className="nav-link pt-0.5">Rapporter</a>
                <a href="/settings" className="nav-link pt-0.5">Inställningar</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="badge-pro">Pro</span>
              <div className="h-5 w-px bg-slate-200 mx-1" />
              {showAzure && activeTab === "active" && approvedDocs.length > 0 && (
                <ExportToAzureButton selectedDocuments={approvedDocs.map(d => d.id)} />
              )}
              <Link href="/settings" className="text-slate-400 hover:text-indigo-600 transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <AutoFetchButton />
              <form action={async () => {
                "use server";
                const supabase = await createServerComponentClient();
                await supabase.auth.signOut();
                redirect("/login");
              }}>
                <button type="submit" className="text-slate-400 hover:text-red-500 transition-colors" title="Logga ut">
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-md">
                {user.email?.substring(0, 2).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="md:flex md:items-center md:justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dokument</h1>
            <p className="mt-2 text-sm text-slate-500">{strings.reviewDescription}</p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
            <ResetDocumentsButton />
          </div>
        </div>

        {/* Tabs + File Type Filters */}
        <div className="flex items-center justify-between border-b border-slate-200 mt-6">
          <div className="flex gap-6">
            <a
              href={`/dashboard?tab=active${params.type ? `&type=${params.type}` : ''}`}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === "active" || !activeTab
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {strings.active} ({activeTab === "active" ? stats.total : (documents?.filter(d => !d.exported_at).length || 0)})
            </a>
            <a
              href={`/dashboard?tab=archive${params.type ? `&type=${params.type}` : ''}`}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === "archive"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {strings.archived} ({activeTab === "archive" ? stats.total : (documents?.filter(d => d.exported_at).length || 0)})
            </a>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Link
              href={`/dashboard?tab=${activeTab}${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                !params.type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 bg-white ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Alla
            </Link>
            <Link
              href={`/dashboard?tab=${activeTab}&type=pdf${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                params.type === 'pdf'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 bg-white ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </Link>
            <Link
              href={`/dashboard?tab=${activeTab}&type=excel${statusFilter ? `&status=${statusFilter}` : ''}`}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                params.type === 'excel'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 bg-white ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </Link>
          </div>
        </div>
      </div>

      {/* Stats + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stat Cards - Premium gradient design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total */}
          <div className="stat-card group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{strings.total.toUpperCase()}</p>
              <div className="rounded-full bg-indigo-50 p-1.5 group-hover:bg-indigo-100 transition-colors">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-[32px] font-bold text-slate-900 leading-none">{stats.total}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{strings.documents}</p>
          </div>

          {/* Needs Review */}
          <a href="#needs-review-section" className="stat-card group cursor-pointer block">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{strings.needsReview.toUpperCase()}</p>
              <div className="rounded-full bg-amber-50 p-1.5 group-hover:bg-amber-100 transition-colors">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-[32px] font-bold text-slate-900 leading-none">{stats.needsReview}</p>
            <p className="mt-2 text-xs font-medium text-amber-600">Åtgärd krävs</p>
          </a>

          {/* Approved */}
          <div className="stat-card group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{strings.approved.toUpperCase()}</p>
              <div className="rounded-full bg-emerald-50 p-1.5 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-[32px] font-bold text-slate-900 leading-none">{stats.approved}</p>
            <p className="mt-2 text-xs font-medium text-emerald-600">
              {activeTab === "active" ? 'Redo för export' : strings.exported}
            </p>
          </div>

          {/* Failed */}
          <div className="stat-card group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{strings.error.toUpperCase()}</p>
              <div className="rounded-full bg-red-50 p-1.5 group-hover:bg-red-100 transition-colors">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-[32px] font-bold text-slate-900 leading-none">{stats.failed}</p>
            <p className="mt-2 text-xs font-medium text-red-600">Kräver åtgärd</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mb-8">
          <UploadZone />
        </div>

        {/* Batch Processing */}
        {uploadedDocs.length > 0 && (
          <BatchProcessButton uploadedDocs={uploadedDocs} />
        )}

        {/* Quality Metrics - Premium */}
        {processedDocsCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
              <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verifieringsgrad</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{verificationRate.toFixed(0)}%</span>
                  <span className="text-xs text-slate-400">felfria</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Snittkonfidens</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{avgConfidence.toFixed(0)}%</span>
                  <span className="text-xs text-slate-400">säkerhet</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Aktiva Modeller</p>
                <div className="flex -space-x-2 mt-2">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center p-1.5" title="Gemini">
                    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-50 border-2 border-white shadow-sm flex items-center justify-center p-1.5" title="OpenAI">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-green-700" fill="currentColor">
                      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-orange-50 border-2 border-white shadow-sm flex items-center justify-center p-1.5" title="Anthropic">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-orange-700" fill="currentColor">
                      <path d="M17.4224 4.37895C17.4876 4.26789 17.4876 4.12579 17.4224 4.01474L16.223 1.96842C16.1627 1.86579 16.0512 1.8 15.9351 1.8H13.5366C13.4205 1.8 13.309 1.86579 13.2486 1.96842L12.0492 4.01474C11.9841 4.12579 11.9841 4.26789 12.0492 4.37895L13.2486 6.42526C13.309 6.52789 13.4205 6.59368 13.5366 6.59368H15.9351C16.0512 6.59368 16.1627 6.52789 16.223 6.42526L17.4224 4.37895Z" />
                      <path d="M21.2329 10.8789C21.2981 10.7679 21.2981 10.6258 21.2329 10.5147L20.0336 8.46842C19.9733 8.36579 19.8617 8.3 19.7457 8.3H17.3472C17.2311 8.3 17.1196 8.36579 17.0592 8.46842L15.8599 10.5147C15.7947 10.6258 15.7947 10.7679 15.8599 10.8789L17.0592 12.9253C17.1196 13.0279 17.2311 13.0937 17.3472 13.0937H19.7457C19.8617 13.0937 19.9733 13.0279 20.0336 12.9253L21.2329 10.8789Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Needing Attention Callout */}
        {activeTab === "active" && needsReviewTotal > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {needsReviewTotal} dokument behöver granskning
                </p>
                <p className="text-sm text-slate-500">
                  AI:n flaggade osäkra fält — klicka för att granska
                </p>
              </div>
            </div>
            {needsReviewDocs[0]?.id && (
              <Link
                href={`/review/${needsReviewDocs[0].id}`}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Granska nu
              </Link>
            )}
          </div>
        )}

        {/* PRIORITY: Documents Needing Review - SHOW FIRST */}
        {activeTab === "active" && (!statusFilter || statusFilter === 'needs_review') && (
          <div id="needs-review-section" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                {strings.needsReview}
              </h2>
              <p className="text-sm text-slate-500">
                {needsReviewTotal} {strings.documents.toLowerCase()} {config.language === 'sv' ? 'väntar' : config.language === 'en' ? 'waiting' : config.language === 'no' ? 'venter' : 'odottaa'}
              </p>
            </div>

            {needsReviewDocs.length === 0 ? (
              <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 text-center">
                <p className="text-stone-500 text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {config.language === 'sv' ? 'Alla dokument är granskade.' : 'All documents reviewed.'}
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
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center ring-1 ring-amber-100">
                          <FileIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-medium text-stone-900 text-sm truncate mb-1"
                            title={doc.filename}
                          >
                            {/* Prefer original filename if available, otherwise show simplified filename */}
                            {doc.metadata?.original_name || doc.metadata?.originalFileName || truncateFilename(doc.filename, 30).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i, '')}
                          </h3>
                          {/* Show UUID/Full filename as caption if modified */}
                          {(doc.metadata?.original_name || doc.metadata?.originalFileName || doc.filename.match(/^[0-9a-f]{8}-/i)) && (
                            <p className="text-[10px] text-stone-400 font-mono truncate">
                              {truncateFilename(doc.filename, 40)}
                            </p>
                          )}
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
        <FilterSection />

        {/* Senaste Dokument Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {config.language === 'sv' ? 'Senaste dokument' : 
               config.language === 'en' ? 'Recent documents' :
               config.language === 'no' ? 'Nylige dokumenter' :
               'Viimeisimmät asiakirjat'}
            </h2>
            <p className="text-sm text-slate-500">
              {config.language === 'sv' ? `Visar ${recentDocs.length} av ${stats.total} dokument` : 
               config.language === 'en' ? `Showing ${recentDocs.length} of ${stats.total} documents` :
               config.language === 'no' ? `Viser ${recentDocs.length} av ${stats.total} dokumenter` :
               `Näytetään ${recentDocs.length} / ${stats.total} asiakirjaa`}
            </p>
          </div>

          {recentDocs.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-stone-300 p-16 text-center">
              {activeTab === "archive" ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-stone-900 mb-2">
                    {config.language === 'sv' ? 'Inga arkiverade dokument ännu' : 
                     config.language === 'en' ? 'No archived documents yet' :
                     config.language === 'no' ? 'Ingen arkiverte dokumenter ennå' :
                     'Ei arkistoituja asiakirjoja vielä'}
                  </h3>
                  <p className="text-stone-600 mb-6">
                    {config.language === 'sv' ? 'Exporterade dokument visas här' : 
                     config.language === 'en' ? 'Exported documents will appear here' :
                     config.language === 'no' ? 'Eksporterte dokumenter vises her' :
                     'Viedyt asiakirjat näkyvät täällä'}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Inga mallar. Inga inställningar. Bara dra in din fil.
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">
                    Ladda upp en PDF, Excel eller bild — Solvix extraherar data automatiskt. 
                    Inget att konfigurera, det funkar direkt.
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <AutoFetchButton />
                    <ResetDocumentsButton />
                  </div>
                </>
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
                const iconColorClass = isExcel ? "text-green-600" : "text-red-500";
                const iconBgClass = isExcel ? "bg-green-50 ring-1 ring-green-100" : "bg-red-50 ring-1 ring-red-100";

                // Determine processing status and stall check
                const isStalled = doc.status === 'uploaded' && (new Date().getTime() - new Date(doc.created_at).getTime() > 24 * 60 * 60 * 1000);
                const displayStatus = isStalled ? 'error' : doc.status;
                const statusLabel = isStalled ? (config.language === 'sv' ? 'Avstannad' : 'Stalled') : undefined;

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all"
                  >
                    {/* Document Header */}
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-10 h-10 ${iconBgClass} rounded-lg flex items-center justify-center`}>
                            {doc.status === 'processing' ? (
                              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FileIcon className={`w-5 h-5 ${iconColorClass}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-medium text-stone-900 text-sm truncate mb-1"
                              title={doc.filename}
                            >
                              {doc.metadata?.original_name || doc.metadata?.originalFileName || truncateFilename(doc.filename, 30).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i, '')}
                            </h3>
                            {(doc.metadata?.original_name || doc.metadata?.originalFileName || doc.filename.match(/^[0-9a-f]{8}-/i)) && (
                              <p className="text-[10px] text-stone-400 font-mono truncate">
                                {truncateFilename(doc.filename, 40)}
                              </p>
                            )}
                            <p className="text-xs text-stone-500" title={formatDate(doc.created_at)}>
                              <RelativeTime date={doc.created_at} />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Duplicate Badge */}
                          {doc.is_duplicate && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-700">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                              Möjlig dubblett
                            </div>
                          )}
                          {/* Status Badge */}
                          <StatusBadge status={displayStatus} label={statusLabel} showIcon={true} />
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
                          <span className="text-xs text-emerald-600 font-medium block mb-1">
                            ✓ Auto-godkänd — ingen granskning behövs
                          </span>
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
                            {showAzure && doc.extracted_data?.azure_export_url && (
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
