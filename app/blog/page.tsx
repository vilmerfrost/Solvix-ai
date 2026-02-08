"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight } from "lucide-react";

export default function BlogPage() {
  const posts = [
    {
      title: "Varför 'Prompt Engineering' är framtiden för logistik",
      date: "2024-02-01",
      cat: "ENGINEERING",
      read: "5 min read"
    },
    {
      title: "Migrera från manuell inmatning till AI: En guide",
      date: "2024-01-28",
      cat: "GUIDE",
      read: "8 min read"
    },
    {
      title: "Vi sänkte vår latens med 40% - här är hur",
      date: "2024-01-15",
      cat: "TECH",
      read: "12 min read"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
             <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Transmission Log</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              BLOGG & NYHETER
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Tekniska djupdykningar, produktuppdateringar och tankar om framtiden för automatiserad logistik.
            </p>
          </div>

          {/* Posts Grid */}
          <div className="grid gap-12">
            {posts.map((post, i) => (
              <article key={i} className="group grid md:grid-cols-12 gap-8 items-center cursor-pointer border-b border-neutral-100 pb-12">
                <div className="md:col-span-3 font-mono text-sm text-neutral-500">
                  <div className="font-bold text-neutral-900 mb-2">{post.cat}</div>
                  <div>{post.date}</div>
                  <div>{post.read}</div>
                </div>
                <div className="md:col-span-9">
                  <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 group-hover:text-blue-600 transition-colors leading-tight">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-2 text-neutral-900 font-bold group-hover:translate-x-2 transition-transform duration-300">
                    LÄS ARTIKEL <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
