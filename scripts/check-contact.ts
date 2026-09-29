/**
 * The contact record's rules, checked without a browser.
 *
 * The email in this record is where every enquiry is delivered, so the rules
 * that guard it are worth asserting on their own rather than only through the
 * panel.
 */

import { deriveContact, SEED_CONTACT_SOURCE } from "../src/data/contact";
import { validateContact } from "../src/lib/contact-validate";
import type { ContactSource } from "../src/data/types";

let failures = 0;

function is(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`FAIL  ${label}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`);
  }
}

function rejects(label: string, mutate: (d: ContactSource) => void, needle: string) {
  const d = structuredClone(SEED_CONTACT_SOURCE);
  mutate(d);
  const errors = validateContact(d);
  const hit = errors.some((e) => e.toLowerCase().includes(needle.toLowerCase()));
  if (!hit) {
    failures++;
    console.error(`FAIL  ${label}\n      errors were ${JSON.stringify(errors)}`);
  }
}

/* ── the seed itself must be publishable ─────────────────────────────────── */
is("the seed passes its own rules", validateContact(SEED_CONTACT_SOURCE), []);

/* ── derivation ──────────────────────────────────────────────────────────── */
const v = deriveContact(SEED_CONTACT_SOURCE);
is("the address line joins street and city", v.addressLine, "Rua Saudade 14, Lisboa");
is("the region line carries the postcode", v.addressRegion, "1100-321 Lisboa, Portugal");
is("the footer's short form", v.cityCountry, "Lisboa, Portugal");
is("a negative longitude reads west", v.coordinatesLabel, "38.7223° N · 9.1393° W");
is("the phone link keeps only dialable characters", v.telHref, "tel:+351210000000");
is("the map link is built from the written address",
   v.mapsHref.includes(encodeURIComponent("Rua Saudade 14, 1100-321, Lisboa, Portugal")), true);

// A studio that moved to the southern or eastern hemisphere should still read
// correctly — the hemisphere letters are computed, not typed.
const antipode = deriveContact({
  ...SEED_CONTACT_SOURCE,
  coordinates: { lat: -33.8688, lon: 151.2093 },
});
is("southern and eastern hemispheres", antipode.coordinatesLabel, "33.8688° S · 151.2093° E");

/* ── the rules that protect delivery ─────────────────────────────────────── */
rejects("an email without an @ is refused", (d) => { d.email = "studio.kiddostudio.pt"; }, "does not look like an email");
rejects("an empty email is refused", (d) => { d.email = ""; }, "does not look like an email");
rejects("a phone made of letters is refused", (d) => { d.phone = "call us"; }, "does not look like a phone");
rejects("an empty street is refused", (d) => { d.address.street = "  "; }, "street address cannot be empty");
rejects("an impossible latitude is refused", (d) => { d.coordinates.lat = 120; }, "between -90 and 90");
rejects("a social link with no address is refused", (d) => { d.social[0].url = ""; }, "https://");
rejects("the dead href that used to be there is refused", (d) => { d.social[0].url = "#"; }, "https://");
rejects("two social links with one id are refused", (d) => { d.social[1].id = d.social[0].id; }, "share the id");
rejects("a WhatsApp handle without a link is refused", (d) => { d.whatsapp.url = "wa.me/351"; }, "WhatsApp link");

// Removing every social link is a legitimate choice, not an error.
const noSocial = structuredClone(SEED_CONTACT_SOURCE);
noSocial.social = [];
is("no social links at all is allowed", validateContact(noSocial), []);

// So is dropping WhatsApp entirely.
const noWhatsapp = structuredClone(SEED_CONTACT_SOURCE);
noWhatsapp.whatsapp = { handle: "", url: "", note: "" };
is("no WhatsApp is allowed", validateContact(noWhatsapp), []);

if (failures) {
  console.error(`\ncheck-contact: ${failures} failure(s)`);
  process.exit(1);
}
console.log("check-contact: all assertions passed");
