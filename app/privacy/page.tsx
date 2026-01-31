"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Lock, Shield, Eye, Server, Cookie, FileText, Mail } from "lucide-react";

type Language = "sv" | "en";

const CONTENT = {
  sv: {
    title: "Integritetspolicy",
    lastUpdated: "Senast uppdaterad: " + new Date().toLocaleDateString("sv-SE"),
    sections: [
      {
        id: "intro",
        title: "1. Introduktion",
        icon: <Shield className="w-5 h-5" />,
        content: `Vextra AI ("vi", "oss", "vår") värnar om din integritet. Denna integritetspolicy förklarar hur vi samlar in, använder, lagrar och skyddar dina personuppgifter när du använder vår tjänst för dokumentextraktion.`
      },
      {
        id: "controller",
        title: "2. Personuppgiftsansvarig",
        icon: <Lock className="w-5 h-5" />,
        content: `Personuppgiftsansvarig för behandlingen av dina personuppgifter är:`,
        list: [
          "Företagsnamn: Vextra AI",
          "E-post: vilmer.frost@gmail.com"
        ]
      },
      {
        id: "collection",
        title: "3. Vilka uppgifter samlar vi in?",
        icon: <Eye className="w-5 h-5" />,
        content: "Vi samlar in följande kategorier av personuppgifter:",
        list: [
          "Kontouppgifter: E-postadress, namn (om angivet)",
          "Autentiseringsuppgifter: OAuth-tokens från Google/Microsoft (lagras ej av oss direkt, hanteras av Supabase Auth)",
          "Dokumentdata: De dokument du laddar upp för extraktion",
          "Användningsdata: Information om hur du använder tjänsten, inklusive API-anrop och kostnadsstatistik",
          "Tekniska uppgifter: IP-adress, webbläsartyp, enhetsinformation"
        ]
      },
      {
        id: "usage",
        title: "4. Hur använder vi dina uppgifter?",
        icon: <FileText className="w-5 h-5" />,
        content: "Vi använder dina uppgifter för att:",
        list: [
          "Tillhandahålla och förbättra vår dokumentextraheringstjänst",
          "Hantera ditt konto och prenumeration",
          "Kommunicera med dig om tjänsten",
          "Förhindra missbruk och upprätthålla säkerheten",
          "Uppfylla rättsliga skyldigheter"
        ]
      },
      {
        id: "storage",
        title: "5. Lagring och säkerhet",
        icon: <Server className="w-5 h-5" />,
        content: "Dina uppgifter lagras säkert med hjälp av kryptering. Vi använder:",
        list: [
          "Supabase: För databas och autentisering (EU-baserade servrar)",
          "Azure Blob Storage: För dokumentlagring (konfigureras av dig)",
          "AES-256-GCM kryptering: För känsliga uppgifter som API-nycklar"
        ],
        extra: "Vi behåller dina uppgifter så länge ditt konto är aktivt eller så länge det krävs för att uppfylla de syften som beskrivs i denna policy."
      },
      {
        id: "rights",
        title: "6. Dina rättigheter enligt GDPR",
        icon: <Shield className="w-5 h-5" />,
        content: "Du har rätt att:",
        list: [
          "Få tillgång: Begära en kopia av dina personuppgifter",
          "Rättelse: Begära rättelse av felaktiga uppgifter",
          "Radering: Begära att vi raderar dina uppgifter ('rätten att bli glömd')",
          "Dataportabilitet: Få dina uppgifter i ett maskinläsbart format",
          "Invändning: Invända mot viss behandling av dina uppgifter",
          "Begränsning: Begära begränsning av behandlingen"
        ],
        extra: "För att utöva dina rättigheter, kontakta oss på vilmer.frost@gmail.com eller använd funktionerna i Inställningar → Data."
      },
      {
        id: "thirdparty",
        title: "7. Tredjepartsleverantörer",
        icon: <Server className="w-5 h-5" />,
        content: "Vi använder följande tredjepartsleverantörer:",
        list: [
          "AI-leverantörer (Google, OpenAI, Anthropic): För dokumentextraktion - du tillhandahåller egna API-nycklar",
          "Stripe: För betalningshantering",
          "Vercel: För webbhosting",
          "Sentry: För felspårning (anonymiserad data)"
        ]
      },
      {
        id: "cookies",
        title: "8. Cookies",
        icon: <Cookie className="w-5 h-5" />,
        content: "Vi använder nödvändiga cookies för autentisering och sessionhantering. Inga tredjepartscookies för marknadsföring används."
      },
      {
        id: "contact",
        title: "9. Kontakta oss",
        icon: <Mail className="w-5 h-5" />,
        content: "Om du har frågor om denna policy eller vår behandling av dina uppgifter, kontakta oss på:",
        link: { text: "vilmer.frost@gmail.com", href: "mailto:vilmer.frost@gmail.com" }
      }
    ]
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: " + new Date().toLocaleDateString("en-US"),
    sections: [
      {
        id: "intro",
        title: "1. Introduction",
        icon: <Shield className="w-5 h-5" />,
        content: `Vextra AI ("we", "us", "our") values your privacy. This privacy policy explains how we collect, use, store, and protect your personal data when you use our document extraction service.`
      },
      {
        id: "controller",
        title: "2. Data Controller",
        icon: <Lock className="w-5 h-5" />,
        content: `The data controller responsible for processing your personal data is:`,
        list: [
          "Company Name: Vextra AI",
          "Email: vilmer.frost@gmail.com"
        ]
      },
      {
        id: "collection",
        title: "3. What data do we collect?",
        icon: <Eye className="w-5 h-5" />,
        content: "We collect the following categories of personal data:",
        list: [
          "Account Data: Email address, name (if provided)",
          "Authentication Data: OAuth tokens from Google/Microsoft (not stored directly by us, handled by Supabase Auth)",
          "Document Data: The documents you upload for extraction",
          "Usage Data: Information about how you use the service, including API calls and cost statistics",
          "Technical Data: IP address, browser type, device information"
        ]
      },
      {
        id: "usage",
        title: "4. How do we use your data?",
        icon: <FileText className="w-5 h-5" />,
        content: "We use your data to:",
        list: [
          "Provide and improve our document extraction service",
          "Manage your account and subscription",
          "Communicate with you about the service",
          "Prevent abuse and maintain security",
          "Comply with legal obligations"
        ]
      },
      {
        id: "storage",
        title: "5. Storage and Security",
        icon: <Server className="w-5 h-5" />,
        content: "Your data is stored securely using encryption. We use:",
        list: [
          "Supabase: For database and authentication (EU-based servers)",
          "Azure Blob Storage: For document storage (configured by you)",
          "AES-256-GCM Encryption: For sensitive data like API keys"
        ],
        extra: "We retain your data as long as your account is active or as long as necessary to fulfill the purposes described in this policy."
      },
      {
        id: "rights",
        title: "6. Your Rights under GDPR",
        icon: <Shield className="w-5 h-5" />,
        content: "You have the right to:",
        list: [
          "Access: Request a copy of your personal data",
          "Rectification: Request correction of inaccurate data",
          "Erasure: Request deletion of your data ('right to be forgotten')",
          "Data Portability: Receive your data in a machine-readable format",
          "Objection: Object to certain processing of your data",
          "Restriction: Request restriction of processing"
        ],
        extra: "To exercise your rights, contact us at vilmer.frost@gmail.com or use the features in Settings → Data."
      },
      {
        id: "thirdparty",
        title: "7. Third-Party Providers",
        icon: <Server className="w-5 h-5" />,
        content: "We use the following third-party providers:",
        list: [
          "AI Providers (Google, OpenAI, Anthropic): For document extraction - you provide your own API keys",
          "Stripe: For payment processing",
          "Vercel: For web hosting",
          "Sentry: For error tracking (anonymized data)"
        ]
      },
      {
        id: "cookies",
        title: "8. Cookies",
        icon: <Cookie className="w-5 h-5" />,
        content: "We use necessary cookies for authentication and session management. No third-party marketing cookies are used."
      },
      {
        id: "contact",
        title: "9. Contact Us",
        icon: <Mail className="w-5 h-5" />,
        content: "If you have questions about this policy or our processing of your data, contact us at:",
        link: { text: "vilmer.frost@gmail.com", href: "mailto:vilmer.frost@gmail.com" }
      }
    ]
  }
};

export default function PrivacyPage() {
  const [lang, setLang] = useState<Language>("sv");
  const content = CONTENT[lang];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0b]/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-white/90 text-lg tracking-tight group-hover:text-white transition-colors">Vextra AI</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "sv" ? "en" : "sv")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium">{lang === "sv" ? "Svenska" : "English"}</span>
            </button>
            <Link 
              href="/"
              className="p-2 rounded-full hover:bg-white/[0.05] text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 mb-6">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {content.title}
          </h1>
          <p className="text-white/40">
            {content.lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          {content.sections.map((section) => (
            <div 
              key={section.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-white/[0.05] text-white/70">
                  {section.icon}
                </div>
                <h2 className="text-xl font-semibold text-white/90">
                  {section.title}
                </h2>
              </div>
              
              <div className="space-y-4 text-white/60 leading-relaxed">
                <p>{section.content}</p>
                
                {section.list && (
                  <ul className="space-y-2 mt-4 ml-2">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.extra && (
                  <p className="pt-2 text-white/50 text-sm border-t border-white/[0.06] mt-4">
                    {section.extra}
                  </p>
                )}

                {section.link && (
                  <a 
                    href={section.link.href}
                    className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mt-2 font-medium"
                  >
                    {section.link.text}
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center text-sm text-white/30">
          <p>© 2026 Vextra AI. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
