import type { Metadata } from "next";
import { Bebas_Neue, Permanent_Marker, Space_Mono } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kiddo Studio — A Creative Playground",
  description:
    "A creative playground for filmmakers, photographers and dreamers. Studio rental, production, equipment and art department in Lisbon.",
  /*
   * The K mark, in the two colours a tab bar can be.
   *
   * The supplied artwork is black on transparency, which vanishes in a dark
   * tab. src/app/icon.png is that file as given and serves light mode; the
   * white one here is chosen by the browser when the system is dark.
   *
   * favicon.ico and apple-icon.png are picked up from src/app/ by Next's file
   * convention. Both are OPAQUE, on the brand lime — neither has a media query
   * to fall back on, and iOS composites transparency to solid black.
   *
   * Regenerate with `npm run make:icons`; nothing here is hand-drawn.
   */
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    // Declared, not left to the file convention: with `icon` set above, Next
    // stopped emitting the apple-touch-icon link even though the file was
    // still being served. Measured in the rendered head, not assumed.
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${permanentMarker.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
