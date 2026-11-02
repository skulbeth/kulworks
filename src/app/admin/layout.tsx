import type { Metadata, Viewport } from "next";

// Every admin page (login included) can be installed as the Kulworks app: the
// manifest is what Android reads for the name, icon and full-screen launch.
export const metadata: Metadata = {
  manifest: "/kulworks-app.webmanifest",
  appleWebApp: { capable: true, title: "Kulworks", statusBarStyle: "black-translucent" },
  icons: { apple: "/app/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0d1220",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
