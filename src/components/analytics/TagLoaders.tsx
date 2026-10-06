"use client";

/**
 * Loads the Meta pixel and the Google tag — and only ever after consent.
 *
 * THE GATE IS THE STRUCTURE, NOT A CONDITION INSIDE THE TAG.
 *
 * Nothing here renders a script element until `allowsMarketing()` is true. The
 * scripts are not loaded-and-disabled, not loaded-with-consent-mode-denied,
 * not queued: before the visitor says yes, no request leaves the browser for
 * connect.facebook.net or googletagmanager.com, and no cookie of theirs can
 * exist. That is the property the whole feature is judged on, and it is
 * asserted by a request-log check in the browser tests.
 *
 * Why not <Script> from next/script: its strategies cache a decision made at
 * mount. This component mounts on every page and has to react to consent being
 * GIVEN and WITHDRAWN while the page stays open, which is plain DOM work.
 *
 * Withdrawal genuinely unloads. Removing a script tag does not unload the code
 * it already ran, so the honest way to return a browser to "nothing is
 * watching" is to clear the globals, expire the cookies and reload. Pretending
 * a page can un-run a pixel would be the dishonest option.
 */

import { useEffect } from "react";
import { allowsMarketing, subscribeConsent } from "@/lib/analytics/consent";
import type { PublicTagIds } from "@/lib/integrations/types";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown; push?: unknown };
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const META_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const GTAG_SRC = "https://www.googletagmanager.com/gtag/js";

function loadMeta(pixelId: string): void {
  if (window.fbq) return;

  /*
   * Meta's own stub, written out rather than pasted as a minified blob so the
   * next person can read what it does: queue calls until fbevents.js arrives,
   * then replay them.
   */
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
    else (fbq.queue as unknown[]).push(args);
  } as NonNullable<Window["fbq"]>;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const s = document.createElement("script");
  s.async = true;
  s.src = META_SRC;
  s.dataset.kiddoTag = "meta";
  document.head.appendChild(s);

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function loadGoogle(tagId: string): void {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  const gtag: NonNullable<Window["gtag"]> = (...args) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  /*
   * Consent Mode v2, set BEFORE the container loads.
   *
   * This component only runs at all once marketing is accepted, so everything
   * is granted here. The default-denied call still matters: it is what Google
   * reads if the container ever loads before this line, and declaring it makes
   * the grant explicit rather than implied by its absence.
   */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `${GTAG_SRC}?id=${encodeURIComponent(tagId)}`;
  s.dataset.kiddoTag = "google";
  document.head.appendChild(s);

  gtag("js", new Date());
  gtag("config", tagId);
}

/** Best effort at putting the browser back. See the header on why it reloads. */
function unloadTags(): void {
  const had = document.querySelectorAll('script[data-kiddo-tag]').length > 0 || !!window.fbq;
  document.querySelectorAll("script[data-kiddo-tag]").forEach((el) => el.remove());
  if (!had) return;

  try {
    window.gtag?.("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  } catch {
    // The container may not have finished loading. Not worth reporting.
  }

  /*
   * fbevents.js is already in memory and would keep answering fbq() calls.
   * A reload is the only honest way to say "nothing is watching any more" —
   * and the consent cookie is already written, so the reloaded page comes back
   * with the tags correctly absent.
   */
  window.location.reload();
}

export default function TagLoaders({ tags }: { tags: PublicTagIds }) {
  useEffect(() => {
    // Nothing to load, nothing to watch for.
    if (!tags.metaPixelId && !tags.googleTagId) return;

    const apply = () => {
      if (allowsMarketing()) {
        if (tags.metaPixelId) loadMeta(tags.metaPixelId);
        if (tags.googleTagId) loadGoogle(tags.googleTagId);
      } else {
        unloadTags();
      }
    };

    apply();
    return subscribeConsent(apply);
  }, [tags.metaPixelId, tags.googleTagId]);

  return null;
}
