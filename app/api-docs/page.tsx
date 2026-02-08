"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Code, Copy, Terminal } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-12 border-b border-neutral-200 pb-12">
             <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">REST API v1</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              API DOKUMENTATION
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Programmatisk åtkomst till hela Solvix.ai-plattformen. Integrera dokumentanalys direkt i din egen applikation.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12">
            
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 hidden lg:block">
              <div className="sticky top-32 space-y-8">
                <div>
                  <h3 className="font-bold text-neutral-900 mb-4 uppercase tracking-wider text-sm">Getting Started</h3>
                  <ul className="space-y-2 font-mono text-sm text-neutral-600">
                    <li className="text-blue-600 font-bold cursor-pointer">Introduction</li>
                    <li className="hover:text-neutral-900 cursor-pointer">Authentication</li>
                    <li className="hover:text-neutral-900 cursor-pointer">Rate Limits</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 mb-4 uppercase tracking-wider text-sm">Endpoints</h3>
                  <ul className="space-y-2 font-mono text-sm text-neutral-600">
                    <li className="hover:text-neutral-900 cursor-pointer">POST /process</li>
                    <li className="hover:text-neutral-900 cursor-pointer">GET /documents/{`{id}`}</li>
                    <li className="hover:text-neutral-900 cursor-pointer">GET /status</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-16">
              
              {/* Authentication */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-neutral-100 rounded">
                    <Terminal className="w-5 h-5 text-neutral-900" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">Authentication</h2>
                </div>
                <p className="text-neutral-600 mb-6 leading-relaxed">
                  Authenticate your requests by including your API key in the Authorization header. You can manage your API keys in the dashboard settings.
                </p>
                <div className="bg-neutral-900 rounded-lg p-6 overflow-x-auto group relative">
                  <button className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <pre className="font-mono text-sm text-green-400">
                    <code>Authorization: Bearer vk_live_7a8b9c...</code>
                  </pre>
                </div>
              </section>

              {/* POST /process */}
              <section>
                 <div className="flex items-center gap-4 mb-6">
                   <span className="bg-blue-600 text-white font-mono font-bold px-3 py-1 text-sm rounded">POST</span>
                   <h2 className="text-2xl font-bold text-neutral-900 font-mono">/v1/process</h2>
                 </div>
                 <p className="text-neutral-600 mb-6 leading-relaxed">
                   Upload a document for immediate processing. Supports multipart/form-data for files or JSON for URLs.
                 </p>
                 
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-neutral-900">Request Body</h3>
                     <div className="space-y-2 font-mono text-sm">
                       <div className="flex justify-between border-b border-neutral-100 py-2">
                         <span className="text-neutral-900 font-bold">file</span>
                         <span className="text-neutral-500">File (Binary)</span>
                       </div>
                       <div className="flex justify-between border-b border-neutral-100 py-2">
                         <span className="text-neutral-900 font-bold">webhook_url</span>
                         <span className="text-neutral-500">String (Opt)</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="bg-neutral-900 rounded-lg p-6 overflow-x-auto text-sm">
                      <div className="flex items-center justify-between text-neutral-500 text-xs font-mono mb-4 border-b border-neutral-800 pb-2">
                        <span>EXAMPLE REQUEST</span>
                        <span>CURL</span>
                      </div>
<pre className="font-mono text-neutral-300">
{`curl -X POST https://api.solvix.ai/v1/process \\
  -H "Authorization: Bearer vk_live..." \\
  -F "file=@invoice.pdf"`}
</pre>
                   </div>
                 </div>
              </section>

              {/* Response Example */}
              <section>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-neutral-900">Example Response (200 OK)</h3>
                <div className="bg-neutral-900 rounded-lg p-6 overflow-x-auto text-sm font-mono text-green-400">
<pre>
{`{
  "id": "doc_8f9a2b3c",
  "status": "processing",
  "created_at": "2024-02-08T10:00:00Z",
  "estimated_completion": "0.4s"
}`}
</pre>
                </div>
              </section>

            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
