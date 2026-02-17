import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OfficeAdminPanel } from "@/components/office/office-admin-panel";

export const dynamic = "force-dynamic";

export default function OfficeITSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
        </div>
        <OfficeAdminPanel />
      </div>
    </div>
  );
}
