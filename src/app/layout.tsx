import type { Metadata } from "next";
import Script from "next/script";
import { Graduate, Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";
import NotificationPrompt from "@/components/NotificationPrompt";
import "./globals.css";

const graduate = Graduate({ weight: "400", subsets: ["latin"], variable: "--font-graduate" });
const barlow = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
});
const plexMono = IBM_Plex_Mono({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-plex-mono" });

const SITE_URL = "https://adamshallfantasyleague.com";
const SITE_TITLE = "Adams Hall Fantasy League";
const SITE_DESC = "The clubhouse. Est. 2021. Members only.";

// Link previews (iMessage, WhatsApp, Slack, Twitter) read these tags.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AHFL",
  },
  openGraph: {
    type: "website",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Adams Hall Fantasy League crest" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og.png"],
  },
};

// Supabase invite / recovery links land on the Site URL with the token in the
// hash. Send them to /welcome (which sets the password) before React loads.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const AUTH_REDIRECT = `(function(){var h=location.hash;if(!h||location.pathname.indexOf("/welcome")!==-1)return;if(/type=(invite|recovery|magiclink|signup)|error=/.test(h))location.replace("${BASE}/welcome/"+h);})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="auth-redirect" strategy="beforeInteractive">{AUTH_REDIRECT}</Script>
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f1e17" />
      </head>
      <body
        className={`${graduate.variable} ${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable} antialiased`}
      >
        <AuthGate>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
          <NotificationPrompt />
        </AuthGate>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
        `}</Script>
        <footer className="border-t border-line py-8 text-center">
          <p className="kicker">Adams Hall Fantasy League · Est. 2021 · Members Only</p>
          <p className="mt-2 text-xs text-cream-dim">
            Static build for GitHub Pages · league data locks behind Supabase
          </p>
        </footer>
      </body>
    </html>
  );
}
