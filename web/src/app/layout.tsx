import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeBootstrap } from "@/components/theme/theme-bootstrap";
import { Inter } from "next/font/google";
import "./globals.css";
import "./theme-tokens.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateViewport(): Promise<Viewport> {
  const theme = (await cookies()).get("flenzr_theme")?.value;
  return { themeColor: theme === "light" ? "#ffffff" : "#09090b" };
}

export const metadata: Metadata = {
  title: "Flenzr — The Marketplace for Influencers & Brands",
  description:
    "The premier influencer marketplace where creators monetize their reach with upfront rate cards in ₹ and brands scale high-converting sponsorship campaigns.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

import { LocalDataBoundary } from "@/components/local-data-boundary";
import { LanguageProvider } from "@/lib/i18n/language-context";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storedTheme = (await cookies()).get("flenzr_theme")?.value;
  const initialTheme = storedTheme === "light" ? "light" : "dark";
  return (
    <html
      lang="en"
      className={`${inter.variable} ${initialTheme === "dark" ? "dark" : ""} h-full antialiased`}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cambay:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[color:var(--ui-paint-09090b)] text-[color:var(--ui-ink-neutral-100)] selection:bg-[color:var(--ui-paint-c1121f)] selection:text-[color:var(--ui-ink-ffffff)]">
        <ThemeProvider initialTheme={initialTheme}>
          <LanguageProvider>
            <LocalDataBoundary>{children}</LocalDataBoundary>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
