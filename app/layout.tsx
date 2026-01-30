import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { getTenantConfig, getHtmlLang } from "@/config/tenant";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair"
});

export async function generateMetadata(): Promise<Metadata> {
  const config = getTenantConfig();
  
  const descriptions: Record<string, string> = {
    sv: "AI-driven dokumenthantering",
    en: "AI-powered document processing",
    no: "AI-drevet dokumenthåndtering",
    fi: "Tekoälykäyttöinen asiakirjankäsittely",
  };
  
  return {
    title: `${config.companyName} - Intelligent Document Extraction`,
    description: descriptions[config.language] || descriptions.sv,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getTenantConfig();
  const htmlLang = getHtmlLang(config);
  
  return (
    <html lang={htmlLang}>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-white text-slate-900`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
