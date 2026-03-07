import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
// ❌ REMOVIDO: import { SessionProvider } from "next-auth/react";
// ✅ ADICIONADO: A nossa nova importação do client component
import { Providers } from "@/components/providers"; 
import "./globals.css";

// ─────────────────────────────────────────────
// Fontes
// ─────────────────────────────────────────────
const fontDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

// ─────────────────────────────────────────────
// Metadata SEO / PWA
// ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "UrbanDesk — Gestão Municipal Inteligente",
    template: "%s | UrbanDesk",
  },
  description:
    "Plataforma B2G de gestão de projetos de infraestrutura urbana com GIS integrado para prefeituras.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-urbandesk.svg",
    apple: "/apple-touch-icon.png",
  },
  keywords: ["gestão municipal", "GIS", "infraestrutura urbana", "prefeitura", "B2G", "obras públicas"],
  authors: [{ name: "UrbanDesk" }],
  robots: { index: false, follow: false }, // SaaS privado
};

export const viewport: Viewport = {
  themeColor: "#192b8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ─────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* ✅ ADICIONADO: Usando o nosso novo componente Providers */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}