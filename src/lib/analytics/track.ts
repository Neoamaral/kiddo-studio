"use client";

/**
 * track() — the one call site for measurement in the browser.
 *
 * BATCHED, NOT ONE REQUEST PER CLICK. A visitor produces twenty-five or so
 * events; one request each would be twenty-five round trips and twenty-five
 * Neon writes for a page nobody is watching. Events queue and flush on a
 * timer, when the queue fills, or when the page is being left — which is the
 * only moment that cannot be deferred.
 *
 * sendBeacon on the way out, fetch otherwise. A fetch started during pagehide
 * is routinely cancelled by the browser; sendBeacon is the API that exists
 * precisely because of that, and it cannot be cancelled by navigation.
 *
 * NOTHING LEAVES BEFORE CONSENT. Events raised while the banner is still open
 * are held in memory, capped, with their real timestamps — on accept they
 * flush, on decline they are dropped and never written. Without that buffer
 * every session would lose its own first page_view, which is exactly the event
 * most likely to happen before someone answers.
 *
 * The route is /api/pulse and not /api/track because generic blocklists match
 * paths containing the word "track".
 */

import { allowsAnalytics, subscribeConsent } from "./consent";
import { safePath, type EventName } from "./events";

const ENDPOINT = "/api/pulse";
const FLUSH_MS = 12_000;
const MAX_BATCH = 20;
/** Held while the banner is open. Beyond this, the oldest are dropped. */
const MAX_BUFFER = 40;

interface Queued {
  name: EventName;
  path: string | null;
  /** Milliseconds ago, resolved to a timestamp by the server. */
  age: number;
  at: number;
  step?: string;
  stepIndex?: number;
  ref?: string;
  props?: Record<string, unknown>;
}

let queue: Queued[] = [];
let buffered: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let session: { id: string; meta: Record<string, unknown> } | null = null;

/** 16 lowercase alphanumerics. Lives in sessionStorage, so it dies with the tab. */
function sessionId(): string {
  const KEY = "kiddo_sid";
  try {
    const found = sessionStorage.getItem(KEY);
    if (found && /^[a-z0-9]{8,32}$/.test(found)) return found;
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode can throw on write. A per-page-load id is still a usable
    // session for a funnel; it just cannot span a navigation.
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

/** Read once per session: where this visit came from. */
function sessionMeta(): Record<string, unknown> {
  const url = new URL(location.href);
  const q = url.searchParams;
  return {
    landingPath: safePath(url.pathname),
    referrer: document.referrer || null,
    utmSource: q.get("utm_source"),
    utmMedium: q.get("utm_medium"),
    utmCampaign: q.get("utm_campaign"),
    // The click id VALUE is never sent. Only that one was present.
    paid: !!(q.get("fbclid") || q.get("gclid")),
    device: device(),
  };
}

function ensureSession(): { id: string; meta: Record<string, unknown> } {
  if (!session) session = { id: sessionId(), meta: sessionMeta() };
  return session;
}

function send(batch: Queued[], beacon: boolean): void {
  if (batch.length === 0) return;
  const s = ensureSession();
  const now = Date.now();
  const body = JSON.stringify({
    session: { id: s.id, ...s.meta },
    events: batch.map((e) => ({
      name: e.name,
      path: e.path,
      age: Math.max(0, now - e.at),
      step: e.step,
      stepIndex: e.stepIndex,
      ref: e.ref,
      props: e.props,
    })),
  });

  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Measurement is never worth a visible failure.
    });
  } catch {
    // Same.
  }
}

function flush(beacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue;
  queue = [];
  send(batch, beacon);
}

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => flush(false), FLUSH_MS);
}

export interface TrackOptions {
  step?: string;
  stepIndex?: number;
  ref?: string;
}

export function track(
  name: EventName,
  props?: Record<string, unknown>,
  opts?: TrackOptions
): void {
  if (typeof window === "undefined") return;

  const item: Queued = {
    name,
    path: safePath(location.pathname),
    age: 0,
    at: Date.now(),
    step: opts?.step,
    stepIndex: opts?.stepIndex,
    ref: opts?.ref,
    props,
  };

  if (!allowsAnalytics()) {
    // Memory only. Dropped entirely if the answer turns out to be no.
    buffered.push(item);
    if (buffered.length > MAX_BUFFER) buffered.shift();
    return;
  }

  queue.push(item);
  if (queue.length >= MAX_BATCH) flush(false);
  else schedule();
}

let started = false;

/** Called once by SiteAnalytics. Wires the flush triggers and the consent watch. */
export function startTracking(): () => void {
  if (started) return () => {};
  started = true;

  const onConsent = () => {
    if (allowsAnalytics()) {
      // The buffered events keep their original timestamps, so the funnel's
      // entry step is not quietly moved to the moment of consent.
      queue.push(...buffered);
      buffered = [];
      flush(false);
    } else {
      buffered = [];
      queue = [];
    }
  };

  const onHide = () => {
    if (document.visibilityState === "hidden") flush(true);
  };

  const unsubscribe = subscribeConsent(onConsent);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", () => flush(true));

  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", onHide);
    started = false;
  };
}
