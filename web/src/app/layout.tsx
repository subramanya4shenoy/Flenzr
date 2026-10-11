import type { Metadata, Viewport } from "next";
import { Cambay } from "next/font/google";
import "./globals.css";

const cambay = Cambay({
  weight: ["400", "700"],
  subsets: ["latin", "devanagari"],
  variable: "--font-cambay",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Flenzr — The Marketplace for Influencers & Brands",
  description:
    "The premier influencer marketplace where creators monetize their reach with upfront rate cards in ₹ and brands scale high-converting sponsorship campaigns.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cambay.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cambay:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-black selection:bg-[#c1121f] selection:text-white">
        {children}
      </body>
    </html>
  );
}
