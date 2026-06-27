import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import localFont from "next/font/local";
import "@/styles/global.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { siteGraph } from "@/lib/structured-data";

// Body + UI font (rounded, friendly). Matches Role to Reign.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
});

// Brand wordmark font (clean-studio choice: used for the logo only).
const dumbledoor = localFont({
  src: "../../fonts/dum1.ttf",
  variable: "--font-dumbledoor",
  display: "swap",
});

// Available for occasional fantasy accents.
const vinque = localFont({
  src: "../../fonts/vinque.otf",
  variable: "--font-vinque",
  display: "swap",
});

const SITE_URL = "https://kulworks.com";

// Matches the dark theme so mobile browser chrome (address bar) blends in.
export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kulworks: Custom Card Printing & 3D in San Antonio",
    template: "%s | Kulworks",
  },
  description:
    "Custom card printing in San Antonio: poker through tarot sizes, prototype decks and short runs. Kulworks also does UV-printed board game tiles, FDM and resin 3D printing, and 3D design, all made in-house.",
  applicationName: "Kulworks",
  alternates: { canonical: "/" },
  keywords: [
    "custom card printing San Antonio",
    "playing card printing",
    "tarot card printing",
    "board game prototype printing",
    "game prototype cards",
    "UV printing board game tiles",
    "3D printing San Antonio",
    "resin miniatures",
    "FDM printing",
    "Shapr3D design",
    "maker studio San Antonio",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Kulworks",
    locale: "en_US",
    title: "Kulworks: Custom Card Printing & 3D in San Antonio",
    description:
      "One studio, many materials. Custom cards (poker to tarot), board game tiles, and 3D printing, designed and made in-house in San Antonio.",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Kulworks" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kulworks: Custom Card Printing & 3D in San Antonio",
    description:
      "One studio, many materials. Custom cards (poker to tarot), board game tiles, and 3D printing, designed and made in-house in San Antonio.",
    images: ["/images/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${dumbledoor.variable} ${vinque.variable}`}
    >
      <body className="font-sans bg-background text-foreground min-h-screen flex flex-col">
        <JsonLd data={siteGraph()} />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
