"use client";

/**
 * The one mount point for consent and, from phase 1, for tracking.
 *
 * Lives in the root layout because that is the only file on every page —
 * Header and Footer are imported per page, so neither is global in the way
 * this has to be.
 *
 * TWO ROUTES ARE EXCLUDED, and the second one is security rather than taste:
 *
 *   /admin/*          The studio browsing its own site would pollute every
 *                     funnel number, and tracking an authenticated panel is a
 *                     liability in exchange for nothing.
 *
 *   /booking/confirm  That page is reached from an email and carries a SECRET
 *                     TOKEN in the query string (`?t=…`). It is the reason the
 *                     rule throughout this feature is that a query string is
 *                     never recorded, anywhere — but a page whose whole URL is
 *                     a credential does not get a tracker mounted on it at all.
 */

import { usePathname } from "next/navigation";
import { hydrateConsent, type ConsentState } from "@/lib/analytics/consent";
import ConsentBanner from "./ConsentBanner";

/**
 * Hydrating during render rather than in an effect, on purpose: an effect runs
 * after the first paint, and a returning visitor would see the banner for one
 * frame before it decided it had no business being there.
 *
 * It is idempotent (hydrateConsent returns early once set), so React calling a
 * component body twice in development changes nothing.
 */
export default function SiteAnalytics({
  initialConsent,
}: {
  initialConsent: ConsentState | null;
}) {
  hydrateConsent(initialConsent);

  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname === "/booking/confirm") return null;

  return <ConsentBanner />;
}
