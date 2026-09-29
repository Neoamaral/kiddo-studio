/**
 * The rules a set of contact details must satisfy before it is published.
 *
 * These matter more than they look. The email here is not only printed on the
 * page — it is where booking requests and contact-form messages are delivered.
 * A typo saved without checking would not break the site; it would silently
 * send every enquiry into nowhere. So the address is validated, and a save that
 * empties it is refused outright.
 */

import type { ContactSource } from "@/data/types";

/** Deliberately permissive — enough to catch a typo, not to police addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/** "+351 21 000 0000", "00351 210 000 000", "21 000 0000" — but not letters. */
const PHONE = /^[+0-9][0-9\s().-]{5,}$/;

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateContact(data: ContactSource): string[] {
  const errors: string[] = [];
  const need = (value: string, what: string) => {
    if (!value.trim()) errors.push(`${what} cannot be empty.`);
  };

  if (!EMAIL.test(data.email.trim())) {
    errors.push(
      `"${data.email}" does not look like an email address. Enquiries are delivered here, so it has to be right.`
    );
  }
  if (!PHONE.test(data.phone.trim())) {
    errors.push(`"${data.phone}" does not look like a phone number.`);
  }

  need(data.address.street, "The street address");
  need(data.address.city, "The city");
  need(data.address.country, "The country");

  const { lat, lon } = data.coordinates;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("Latitude has to be a number between -90 and 90.");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push("Longitude has to be a number between -180 and 180.");
  }

  if (data.whatsapp.handle.trim() && !isHttps(data.whatsapp.url)) {
    errors.push(
      "The WhatsApp link needs to be a full https:// address, e.g. https://wa.me/351210000000"
    );
  }

  const seen = new Set<string>();
  data.social.forEach((s, i) => {
    const where = s.label.trim() || `social link ${i + 1}`;
    if (!s.label.trim()) errors.push(`Social link ${i + 1} has no name.`);
    if (!s.handle.trim()) errors.push(`${where} has no handle to show.`);
    if (!isHttps(s.url)) {
      errors.push(
        `${where} needs a full https:// address — otherwise the link is dead, which is what it was before.`
      );
    }
    const id = s.id.trim().toLowerCase();
    if (!id) errors.push(`${where} has no id.`);
    else if (seen.has(id)) errors.push(`Two social links share the id "${id}".`);
    seen.add(id);
  });

  return errors;
}
