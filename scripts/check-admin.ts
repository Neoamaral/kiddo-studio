/**
 * Admin assertions — authentication and the validation rules.
 *
 *   npm run check:admin
 *
 * No network and no filesystem: everything here is a pure function, so a
 * failure means a real defect rather than a flaky environment. The rules under
 * test are the ones standing between the panel and production.
 */

import {
  ADMIN_COOKIE,
  createSession,
  hashPassword,
  verifyPassword,
  verifySession,
} from "../src/lib/admin/auth";
import { validateCatalogue, codesUsedByBundles } from "../src/lib/equipment-validate";
import { validatePricing } from "../src/lib/pricing-validate";
import type {
  EquipmentBundle,
  EquipmentSource,
  EquipmentSourceRow,
  PricingSource,
} from "../src/data/types";

process.env.ADMIN_SESSION_SECRET ||= "test-secret-at-least-32-characters-long!!";

let failures = 0;

const check = (label: string, actual: unknown, expected: unknown) => {
  if (actual === expected) return;
  console.error(`FAIL ${label}: got ${String(actual)}, expected ${String(expected)}`);
  failures++;
};

/** Runs `fn`, reporting whether it threw. */
const threw = (fn: () => unknown): boolean => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

/* ── 1. Passwords ────────────────────────────────────────────────────────── */

// A throwaway fixture on purpose. The studio's real password must never be
// written into the repository, not even as test data.
const PW = "Correct-Horse-Battery-Staple-9!";
const stored = hashPassword(PW);

check("the stored hash is salt:hash", stored.split(":").length, 2);
check("the right password verifies", verifyPassword(PW, stored), true);
check("a wrong password does not", verifyPassword("wrong", stored), false);
check("case matters", verifyPassword(PW.toLowerCase(), stored), false);
check("an empty password does not", verifyPassword("", stored), false);

// Two hashes of the same password must differ — otherwise the salt is not
// doing its job and identical passwords would be identifiable.
check("the salt is random", hashPassword(PW) === hashPassword(PW), false);

// A malformed env var must read as "wrong password", never as a crash.
check("no colon in the stored hash", verifyPassword(PW, "garbage"), false);
check("an empty stored hash", verifyPassword(PW, ""), false);
check("a stored hash of the wrong length", verifyPassword(PW, "aa:bb"), false);

/* ── 2. Session tokens ───────────────────────────────────────────────────── */

const token = createSession("kiddostudio");
check("a fresh session verifies", verifySession(token).u, "kiddostudio");
check("the cookie name is stable", ADMIN_COOKIE, "kiddo_admin");

check("no token is rejected", threw(() => verifySession(undefined)), true);
check("an empty token is rejected", threw(() => verifySession("")), true);
check("a token with no signature is rejected", threw(() => verifySession("abc")), true);

// Flip one character of the signature.
const [body, mac] = token.split(".");
const flipped = mac[0] === "A" ? `B${mac.slice(1)}` : `A${mac.slice(1)}`;
check("a tampered signature is rejected", threw(() => verifySession(`${body}.${flipped}`)), true);

// Swap the payload for a different user, keep the old signature. This is the
// attack the HMAC exists to stop.
const forged = Buffer.from(JSON.stringify({ u: "attacker", e: 9e9 }), "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
check("a swapped payload is rejected", threw(() => verifySession(`${forged}.${mac}`)), true);

// An expired token, signed correctly.
const realSecret = process.env.ADMIN_SESSION_SECRET;
process.env.ADMIN_SESSION_SECRET = realSecret;
const expiredBody = Buffer.from(JSON.stringify({ u: "kiddostudio", e: 1 }), "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
import crypto from "node:crypto";
const expiredMac = crypto
  .createHmac("sha256", realSecret!)
  .update(expiredBody)
  .digest("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
check(
  "an expired session is rejected even though it is signed",
  threw(() => verifySession(`${expiredBody}.${expiredMac}`)),
  true
);

// A token signed with a different secret must not verify under ours.
process.env.ADMIN_SESSION_SECRET = "another-secret-at-least-32-characters!!!";
const otherToken = createSession("kiddostudio");
process.env.ADMIN_SESSION_SECRET = realSecret;
check("a token from another secret is rejected", threw(() => verifySession(otherToken)), true);

/* ── 3. Catalogue validation ─────────────────────────────────────────────── */

const row = (over: Partial<EquipmentSourceRow> = {}): EquipmentSourceRow => ({
  code: "CAM-01",
  category: "CAMERA · BODIES",
  name: "Sony FX6",
  spec: "Full-frame",
  rate: { kind: "fixed", amount: 150, per: "day" },
  inStock: 2,
  ...over,
});

const cat = (rows: EquipmentSourceRow[]): EquipmentSource => ({
  _meta: {
    source: "test",
    notionPageId: "",
    syncedAt: "",
    rowCount: rows.length,
    vatIncluded: false,
    photoCount: rows.reduce((n, r) => n + (r.photos?.length ?? 0), 0),
  },
  rows,
});

const errs = (rows: EquipmentSourceRow[], bundles: EquipmentBundle[] = []) =>
  validateCatalogue(cat(rows), bundles).errors;

check("a clean catalogue has no errors", errs([row()]).length, 0);
check("a clean catalogue has no warnings", validateCatalogue(cat([row()])).warnings.length, 0);

check("duplicate codes are caught", errs([row(), row()]).length, 1);
check("an empty code is caught", errs([row({ code: "" })]).length, 1);
check("a missing name is caught", errs([row({ name: "" })]).length, 1);
check("a missing category is caught", errs([row({ category: "" })]).length, 1);
check("negative stock is caught", errs([row({ inStock: -1 })]).length, 1);
check("fractional stock is caught", errs([row({ inStock: 1.5 })]).length, 1);
check("a negative rate is caught", errs([row({ rate: { kind: "fixed", amount: -5, per: "day" } })]).length, 1);
check(
  "an invalid period is caught",
  errs([row({ rate: { kind: "fixed", amount: 5, per: "fortnight" as never } })]).length,
  1
);
check("a free rate is fine", errs([row({ rate: { kind: "free" } })]).length, 0);

// _meta has to agree with the rows, or the panel wrote them inconsistently.
const wrongCount = cat([row()]);
wrongCount._meta.rowCount = 99;
check("a rowCount that disagrees is caught", validateCatalogue(wrongCount).errors.length, 1);

/* ── 4. Photo rules ──────────────────────────────────────────────────────── */

const withPhoto = (src: string, alt = "Front of the body") =>
  row({ photos: [{ src, alt }] });

check("a well-formed photo is fine", errs([withPhoto("/images/equipment/cam-01/01.jpg")]).length, 0);
check(
  "a remote URL is caught",
  errs([withPhoto("https://example.com/a.jpg")]).length,
  1
);
check(
  "a path outside /images/equipment/ is caught",
  errs([withPhoto("/images/other/01.jpg")]).length,
  1
);
check("a traversal is caught", errs([withPhoto("/images/equipment/../secret.jpg")]).length, 1);
check(
  "an uppercase path is caught — Vercel's disk is case-sensitive",
  errs([withPhoto("/images/equipment/CAM-01/01.jpg")]).length,
  1
);
check(
  "the wrong folder for the code is caught",
  errs([withPhoto("/images/equipment/lit-09/01.jpg")]).length,
  1
);
check("empty alt text is caught", errs([withPhoto("/images/equipment/cam-01/01.jpg", "")]).length, 1);
check(
  "a duplicate src within one item is caught",
  errs([
    row({
      photos: [
        { src: "/images/equipment/cam-01/01.jpg", alt: "a" },
        { src: "/images/equipment/cam-01/01.jpg", alt: "b" },
      ],
    }),
  ]).length,
  1
);

/* ── 5. Bundles ──────────────────────────────────────────────────────────── */

const bundle: EquipmentBundle = {
  id: "cam",
  label: "Camera bundle",
  memberCodes: ["CAM-01", "LNS-01"],
};

check(
  "a bundle naming missing gear is caught",
  errs([row()], [bundle]).length,
  1 // LNS-01 is absent
);
check(
  "a bundle whose members all exist is fine",
  errs([row(), row({ code: "LNS-01", category: "LENSES", name: "35mm" })], [bundle]).length,
  0
);

const used = codesUsedByBundles([bundle]);
check("bundle members are listed as undeletable", used.has("CAM-01"), true);
check("gear outside a bundle is deletable", used.has("AUD-01"), false);

if (failures > 0) {
  console.error(`\n${failures} admin assertion(s) failed.`);
  process.exit(1);
}
console.log("check-admin: all assertions passed");
