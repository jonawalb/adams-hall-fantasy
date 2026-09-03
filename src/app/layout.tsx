import type { Metadata } from "next";
import Script from "next/script";
import { Graduate, Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

const graduate = Graduate({ weight: "400", subsets: ["latin"], variable: "--font-graduate" });
const barlow = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
});
const plexMono = IBM_Plex_Mono({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Adams Hall Fantasy League",
  description: "The clubhouse. Est. 2021. Members only.",
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
      </head>
      <body
        className={`${graduate.variable} ${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable} antialiased`}
      >
        <AuthGate>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        </AuthGate>
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
