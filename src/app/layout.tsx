import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Permanent_Marker, Space_Mono } from "next/font/google";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";
import { CONSENT_COOKIE, decodeConsent } from "@/lib/analytics/consent";
import { getPublicTagIds } from "@/lib/data-source";
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

/*
 * Reading a cookie here opts the whole app out of static rendering.
 *
 * That costs nothing today — every public route already declares
 * `export const dynamic = "force-dynamic"` — and it buys the one thing that
 * cannot be bought any other way: a returning visitor never sees the consent
 * banner flash. Discovering the cookie in the browser means one frame of
 * banner on every navigation, and this site server-renders on every request.
 *
 * If a future page wants to be static, it needs its own layout, not a change
 * here.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
   * Both reads in parallel. The cookie is free; the tag ids are a database
   * round trip on every page, memoised for five seconds and failing to "load
   * nothing" rather than throwing — a database blip must never blank a page.
   */
  const [consent, tags] = await Promise.all([
    Promise.resolve(decodeConsent((await cookies()).get(CONSENT_COOKIE)?.value)),
    getPublicTagIds(),
  ]);

  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${permanentMarker.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <SiteAnalytics initialConsent={consent} tags={tags} />
      </body>
    </html>
  );
}
