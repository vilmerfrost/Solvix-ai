import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";

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

export const metadata: Metadata = {
  title: "Vextra.ai - Automatisk dokumentextraktion för logistik",
  description:
    "Förvandla kaotiska följesedlar till ren Excel. AI-driven dokumentextraktion för waste management och logistikföretag.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="dark">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#0A0A0A] text-[#F5F5F5]`}
      >
        {children}
      </body>
    </html>
  );
}
