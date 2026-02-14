import { createServiceRoleClient } from "@/lib/supabase"; 
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link"; 
import { FileActions } from "@/components/file-actions";

export const dynamic = "force-dynamic";

// HJÄLPFUNKTION: Hanterar både gamla (strängar) och nya (objekt) format
const getValue = (field: any) => {
  if (!field) return null;
  if (typeof field === "object" && "value" in field) return field.value;
  return field;
};

export default async function ArchivePage() {
  const supabase = createServiceRoleClient();

  // Hämta BARA arkiverade dokument
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("archived", true) 
    .order("created_at", { ascending: false });

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
                <Link href="/dashboard" className="nav-link pt-0.5">Dokument</Link>
                <Link href="/health" className="nav-link pt-0.5">Rapporter</Link>
                <Link href="/settings" className="nav-link pt-0.5">Inställningar</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Arkiv</h1>
            <p className="text-sm text-slate-500">Gamla dokument och historik</p>
          </div>
        </header>

        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-medium text-xs">
                <tr>
                  <th className="px-6 py-3">Filnamn</th>
                  <th className="px-6 py-3">Datum</th>
                  <th className="px-6 py-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents?.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4">
                      {getValue(doc.extracted_data?.date) || new Date(doc.created_at).toLocaleDateString("sv-SE")}
                    </td>
                    <td className="px-6 py-4">
                        {/* Här återanvänder vi våra knappar, men säger att vi är på arkivsidan */}
                        <FileActions doc={doc} isArchivedPage={true} />
                    </td>
                  </tr>
                ))}
                {(!documents || documents.length === 0) && (
                   <tr>
                     <td colSpan={3} className="px-6 py-10 text-center text-slate-400">Arkivet är tomt.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}