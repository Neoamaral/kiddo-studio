/**
 * Consent: the gate everything else in analytics sits behind.
 *
 * NOT `server-only` and NOT a React context, deliberately.
 *
 *   - The decoder runs on the SERVER, in the root layout, so a returning
 *     visitor's first paint already knows the answer and no banner flashes.
 *     It runs in the BROWSER too, every time the gate is checked.
 *
 *   - A context cannot serve the callers that matter. `track()` has to be
 *     callable from a submit handler, from a delegated document listener, and
 *     from inside a `setState` updater — none of which are components, none of
 *     which can call a hook. So the state is a module singleton with a
 *     subscribe/notify pair, read by components through `useSyncExternalStore`.
 *     The one other shared mutable thing in this project
 *     (src/lib/db/availability-cache.ts) is a Map and two functions for the
 *     same reason; this follows it rather than inventing a second pattern.
 *
 * The cookie, not localStorage, because the SERVER needs to read it: /api/pulse
 * refuses events from a browser that never consented, and the booking route
 * decides server-side whether Meta's Conversions API may fire. A same-origin
 * request carries a cookie by itself; localStorage would mean the client
 * telling the server what it is allowed to do, which is not a gate at all.
 */

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  /** Epoch SECONDS. Seconds, not ms: it is four characters shorter in a cookie. */
  decidedAt: number;
}

export const CONSENT_COOKIE = "kiddo_consent";

/**
 * 180 days — roughly the six months the EDPB and CNIL point at for re-asking,
 * not the 13 months people copy from older guidance.
 */
export const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/**
 * Bump this when the CATEGORIES change, never for a wording tweak. A bump
 * invalidates every stored answer and re-asks, which is correct when the
 * question changed and obnoxious when it did not.
 */
const VERSION = "v1";

/** "v1.a1.m0.1759640000" */
const SHAPE = /^v1\.a([01])\.m([01])\.(\d{1,12})$/;

export function encodeConsent(state: ConsentState): string {
  const a = state.analytics ? 1 : 0;
  const m = state.marketing ? 1 : 0;
  const at = Math.max(0, Math.floor(state.decidedAt));
  return `${VERSION}.a${a}.m${m}.${at}`;
}

/**
 * FAILS CLOSED. A missing cookie, an old version, a truncated value, a value
 * someone typed by hand — all decode to `null`, which means "no decision yet"
 * and re-prompts. There is no path through this function that invents a yes.
 */
export function decodeConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  const m = SHAPE.exec(raw.trim());
  if (!m) return null;
  const decidedAt = Number(m[3]);
  if (!Number.isFinite(decidedAt)) return null;
  return { analytics: m[1] === "1", marketing: m[2] === "1", decidedAt };
}

/** True when the stored answer is old enough that it should be asked again. */
export function isExpired(state: ConsentState, nowSeconds: number): boolean {
  return nowSeconds - state.decidedAt > CONSENT_MAX_AGE_SECONDS;
}

/* ── The singleton ─────────────────────────────────────────────────────── */

/**
 * `undefined` means "the browser has not been told yet" and is distinct from
 * `null`, which means "asked and not answered". Only the second shows a banner;
 * the first would show one for a frame before hydration and is why the server
 * passes its reading down instead of letting the browser discover it.
 */
let current: ConsentState | null | undefined = undefined;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/** Called once, by SiteAnalytics, with what the server read. */
export function hydrateConsent(initial: ConsentState | null): void {
  if (current !== undefined) return;
  current = initial;
  notify();
}

export function subscribeConsent(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * MUST return a cached reference. Building an object here makes
 * useSyncExternalStore re-render forever, because every snapshot differs.
 */
export function consentSnapshot(): ConsentState | null | undefined {
  return current;
}

/** The server renders with no decision known; the client hydrates immediately. */
export function consentServerSnapshot(): ConsentState | null | undefined {
  return undefined;
}

export function hasDecided(): boolean {
  return current !== undefined && current !== null;
}

export function allowsAnalytics(): boolean {
  return current?.analytics === true;
}

export function allowsMarketing(): boolean {
  return current?.marketing === true;
}

/* ── Writing ───────────────────────────────────────────────────────────── */

function writeCookie(value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  // Secure only where it can be: localhost is http and would silently drop it.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/**
 * Records a decision. Returns the state so a caller can act on it in the same
 * tick without re-reading — the banner flushes its buffered events on accept.
 */
export function setConsent(analytics: boolean, marketing: boolean): ConsentState {
  const state: ConsentState = {
    analytics,
    // Marketing without analytics is a combination the UI does not offer and
    // the gate does not honour: the pixel rides the same track() call.
    marketing: marketing && analytics,
    decidedAt: Math.floor(Date.now() / 1000),
  };
  writeCookie(encodeConsent(state), CONSENT_MAX_AGE_SECONDS);
  current = state;
  notify();
  return state;
}

/**
 * Withdrawal. Expires our own cookie AND makes a best effort at the ones the
 * third parties set, because leaving `_fbp` behind after someone said no is
 * exactly the thing they said no to.
 */
export function withdrawConsent(): void {
  writeCookie("", 0);
  current = null;
  if (typeof document !== "undefined") {
    for (const name of ["_fbp", "_fbc", "_ga", "_gid"]) {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
      // Third parties set theirs on the registrable domain, not the host.
      const parts = location.hostname.split(".");
      if (parts.length > 1) {
        document.cookie = `${name}=; Path=/; Domain=.${parts.slice(-2).join(".")}; Max-Age=0`;
      }
    }
  }
  notify();
}

/** Tests only: the module is a singleton and a test needs a clean one. */
export function __resetConsentForTests(): void {
  current = undefined;
  listeners.clear();
}
