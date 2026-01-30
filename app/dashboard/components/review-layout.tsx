"use client";

import { FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { getTenantConfig, getUIStrings } from "@/config/tenant";

export function ReviewLayout({ children, stats }: { 
  children: React.ReactNode;
  stats: {
    total: number;
    needsReview: number;
    approved: number;
    failed: number;
  };
}) {
  const config = getTenantConfig();
  const strings = getUIStrings(config);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {config.companyName} {strings.review} {strings.dashboard}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {strings.reviewDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">{strings.total}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.needsReview}</div>
                <div className="text-xs text-gray-500">{strings.needsReview}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                <div className="text-xs text-gray-500">{strings.approved}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.failed}</div>
                <div className="text-xs text-gray-500">{strings.error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
