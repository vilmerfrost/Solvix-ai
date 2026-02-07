import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { PostHogProvider } from "@/components/posthog-provider";
import { getTenantConfig, getHtmlLang } from "@/config/tenant";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair"
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
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
    <html lang={htmlLang} className="dark">
      <body className={`${inter.variable} ${playfair.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#0A0A0A] text-[#F5F5F5]`}>
        <PostHogProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
