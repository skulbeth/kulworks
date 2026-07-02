import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import localFont from "next/font/local";
import "@/styles/global.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteFrame from "@/components/SiteFrame";
import JsonLd from "@/components/JsonLd";
import { siteGraph } from "@/lib/structured-data";
import { site } from "@/data/site";

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

// Light is the default theme; these set the mobile browser chrome accordingly.
// (Browsers also honor the two theme-color values below by color scheme.)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  colorScheme: "light dark",
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
  // While under construction the whole site is noindex; flips to indexable when
  // site.constructionMode is set to false.
  robots: {
    index: !site.constructionMode,
    follow: !site.constructionMode,
    googleBot: {
      index: !site.constructionMode,
      follow: !site.constructionMode,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${dumbledoor.variable} ${vinque.variable}`}
      // The pre-paint theme script below sets data-theme on <html>, so the
      // client differs from server-rendered HTML by design. Suppress the
      // expected attribute mismatch on this element only.
      suppressHydrationWarning
    >
      <body className="font-sans bg-background text-foreground min-h-screen flex flex-col">
        {/* Apply saved theme before paint (default light, no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();",
          }}
        />
        <JsonLd data={siteGraph()} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-black"
        >
          Skip to content
        </a>
        <SiteFrame header={<Header />} footer={<Footer />}>
          {children}
        </SiteFrame>
      </body>
    </html>
  );
}
