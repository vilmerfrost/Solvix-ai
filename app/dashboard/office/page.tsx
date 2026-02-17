import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewQueue } from "@/components/office/review-queue";

export const dynamic = "force-dynamic";

export default function OfficeReviewDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Office/IT Review Queue</h1>
          <p className="text-sm text-slate-500">Assign, edit, approve, reject, and track Office/IT review tasks.</p>
        </div>
        <ReviewQueue />
      </div>
    </div>
  );
}
