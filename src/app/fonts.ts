import localFont from "next/font/local";

export const inter = localFont({
  src: "../../public/fonts/inter-latin-400-800.woff2",
  variable: "--font-inter",
  weight: "400 800",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
export const barlowCondensed = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-barlow",
  display: "swap",
  preload: false,
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});
// One declaration per file; prioritize the UI font used by the measured LCP text.
export const barlowDisplay = localFont({
  src: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2",
  variable: "--font-barlow-display",
  preload: true,
  weight: "800",
  display: "swap",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});
export const geistMono = localFont({
  src: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
  fallback: ["Courier New", "monospace"],
});
