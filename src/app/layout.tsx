import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FilmGrainOverlay, GRAIN_URL_WHITE, GRAIN_URL_WHITE_B } from "@/components/FilmGrainOverlay";
// Pretendard ships as one 2 MB variable font; its dynamic subset splits it by unicode-range so a page fetches
// only the Hangul/Latin slices it actually draws.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// Fonts are self-hosted from npm (@fontsource / pretendard) so builds never depend on network access.
const grotesk = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk", weight: "300 700", display: "swap",
});
const serif = localFont({
  src: [
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif", display: "swap",
});
const mono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono", display: "swap",
});

export const metadata: Metadata = {
  title: { default: "COVERAGE — Every Cover Is a World", template: "%s — COVERAGE" },
  description: "An experimental digital museum of book cover art. 표지를 하나의 독립된 작품으로 감상하는 디지털 아카이브.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint: explicit choice (localStorage) wins, otherwise follow the OS.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("coverage:theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${grotesk.variable} ${serif.variable} ${mono.variable}`}
      style={{ "--grain-white": GRAIN_URL_WHITE, "--grain-white-b": GRAIN_URL_WHITE_B } as React.CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:p-3 focus:text-museum">
          Skip to content
        </a>
        <SiteNav />
        <main id="main" className="relative z-[1]">{children}</main>
        <div className="relative z-[1]"><SiteFooter /></div>
        {/* Page-wide paper grain sits beneath content, so archived artwork is never textured. */}
        <FilmGrainOverlay position="fixed" intensity={0.09} />
      </body>
    </html>
  );
}
