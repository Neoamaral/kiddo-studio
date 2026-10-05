/**
 * The consent codec, checked without a browser.
 *
 * This is the gate the whole analytics feature sits behind, and the one place
 * where a bug is silent: a decoder that accidentally returns "yes" for a
 * malformed cookie does not throw, does not log, and does not look wrong on
 * screen — it just starts tracking people who said no. So the property that
 * matters most here is the NEGATIVE one, and most of these assertions are
 * about garbage decoding to "no decision" rather than about the happy path.
 */

import {
  CONSENT_MAX_AGE_SECONDS,
  decodeConsent,
  encodeConsent,
  isExpired,
  type ConsentState,
} from "../src/lib/analytics/consent";

let failures = 0;

function is(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(
      `FAIL  ${label}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`
    );
  }
}

/* ── round trip ──────────────────────────────────────────────────────────── */

const cases: ConsentState[] = [
  { analytics: false, marketing: false, decidedAt: 1759640000 },
  { analytics: true, marketing: false, decidedAt: 1759640000 },
  { analytics: true, marketing: true, decidedAt: 1 },
  { analytics: false, marketing: true, decidedAt: 999999999999 },
];
for (const c of cases) {
  is(`round trip ${encodeConsent(c)}`, decodeConsent(encodeConsent(c)), c);
}

is("the encoding is the documented shape",
   encodeConsent({ analytics: true, marketing: false, decidedAt: 1759640000 }),
   "v1.a1.m0.1759640000");

/* ── FAILS CLOSED ────────────────────────────────────────────────────────── */
//
// Every one of these must be null. Not "false-ish", not a default object —
// null, which means "ask again". A single one of these returning a state with
// analytics: true is a visitor tracked without consent.

const garbage: (string | null | undefined)[] = [
  undefined,
  null,
  "",
  "   ",
  "yes",
  "true",
  "v1",
  "v1.a1",
  "v1.a1.m1",                     // no timestamp
  "v1.a1.m1.",                    // empty timestamp
  "v0.a1.m1.1759640000",          // older version: categories may have changed
  "v2.a1.m1.1759640000",          // newer version written by a future build
  "V1.a1.m1.1759640000",          // case matters
  "v1.a2.m1.1759640000",          // out of range
  "v1.a1.m1.1759640000.extra",    // trailing junk
  "x.v1.a1.m1.1759640000",        // leading junk
  "v1.a1.m1.-1759640000",         // negative
  "v1.a1.m1.1.5",                 // not an integer
  "v1.a1.m1.17596400001234567",   // absurdly long
  "v1.aX.mY.1759640000",
  "v1,a1,m1,1759640000",
  "{\"analytics\":true}",
];
for (const g of garbage) {
  is(`garbage decodes to no-decision: ${JSON.stringify(g)}`, decodeConsent(g), null);
}

/* Whitespace around an otherwise valid value is tolerated — a cookie jar can
   add it — but nothing else is. */
is("surrounding whitespace is tolerated",
   decodeConsent("  v1.a0.m0.1759640000  "),
   { analytics: false, marketing: false, decidedAt: 1759640000 });

/* ── expiry ──────────────────────────────────────────────────────────────── */

const now = 1800000000;
is("a fresh decision is not expired",
   isExpired({ analytics: true, marketing: true, decidedAt: now - 10 }, now), false);
is("a decision one second inside the window is not expired",
   isExpired({ analytics: true, marketing: true, decidedAt: now - CONSENT_MAX_AGE_SECONDS }, now),
   false);
is("a decision one second past the window is expired",
   isExpired({ analytics: true, marketing: true, decidedAt: now - CONSENT_MAX_AGE_SECONDS - 1 }, now),
   true);
is("180 days, not 13 months", CONSENT_MAX_AGE_SECONDS, 180 * 24 * 60 * 60);

/* ── the combination the UI never offers ─────────────────────────────────── */
//
// Marketing rides the same track() call as analytics, so marketing-without-
// analytics is not a state the gate can honour. setConsent() collapses it.
// Asserting the decoder still PARSES it, because a hand-edited cookie can
// contain it and the parser must not throw — the collapsing happens on write.
is("a marketing-only cookie still parses rather than throwing",
   decodeConsent("v1.a0.m1.1759640000"),
   { analytics: false, marketing: true, decidedAt: 1759640000 });

if (failures) {
  console.error(`\ncheck-analytics: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`check-analytics: all assertions passed`);
