/**
 * The studio's contact details, in one place.
 *
 * Same shape as equipment.ts and pricing.ts: a seed that ships with the site,
 * and a `derive` function that turns the stored document into what the
 * components render. Nothing here is computed at module load, so a save in the
 * panel reaches the pages without a rebuild.
 *
 * WHY THE DERIVED STRINGS LIVE HERE
 *
 * The address appeared in five places in four different shapes — "Rua Saudade
 * 14, Lisboa" on the contact card, "1100-321 Lisboa, Portugal" under it,
 * "Lisbon, Portugal" in the footer, and a Google Maps query built by hand. Each
 * was typed separately, so each could drift. They are now one record formatted
 * five ways.
 */

import contactSource from "./contact.source.json";
import type { ContactSource, SocialLink } from "./types";

export type { ContactSource, SocialLink };

/** What components receive: the record plus every string the pages display. */
export interface ContactView {
  email: string;
  emailNote: string;
  mailtoHref: string;

  phone: string;
  phoneNote: string;
  /** Digits only, as `tel:` requires — "+351 21 000 0000" → "tel:+351210000000". */
  telHref: string;

  /** "Rua Saudade 14, Lisboa" */
  addressLine: string;
  /** "1100-321 Lisboa, Portugal" */
  addressRegion: string;
  /** "Lisbon, Portugal" — the footer's short form. */
  cityCountry: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  addressNote: string;

  lat: number;
  lon: number;
  /** "38.7223° N · 9.1393° W" */
  coordinatesLabel: string;
  /** The same, space-separated, for the hero's wide letter-spacing. */
  coordinatesPlain: string;
  mapsHref: string;

  whatsappHandle: string;
  whatsappHref: string;
  whatsappNote: string;

  social: readonly SocialLink[];
}

/** 38.7223 → "38.7223° N"; a negative longitude → "9.1393° W". */
function degrees(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`;
}

export function deriveContact(d: ContactSource): ContactView {
  const { street, postcode, city, country } = d.address;
  const lat = degrees(d.coordinates.lat, "N", "S");
  const lon = degrees(d.coordinates.lon, "E", "W");

  return {
    email: d.email,
    emailNote: d.emailNote,
    mailtoHref: `mailto:${d.email}`,

    phone: d.phone,
    phoneNote: d.phoneNote,
    telHref: `tel:${d.phone.replace(/[^\d+]/g, "")}`,

    addressLine: [street, city].filter(Boolean).join(", "),
    addressRegion: [postcode, city].filter(Boolean).join(" ") + (country ? `, ${country}` : ""),
    cityCountry: [city, country].filter(Boolean).join(", "),
    street,
    postcode,
    city,
    country,
    addressNote: d.addressNote,

    lat: d.coordinates.lat,
    lon: d.coordinates.lon,
    coordinatesLabel: `${lat} · ${lon}`,
    coordinatesPlain: `${lat}  ${lon}`,
    /*
     * The query is the written address rather than the coordinates: Maps then
     * shows the studio by name instead of dropping an unlabelled pin. The
     * coordinates are still stored, because the pages print them.
     */
    mapsHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [street, postcode, city, country].filter(Boolean).join(", ")
    )}`,

    whatsappHandle: d.whatsapp.handle,
    whatsappHref: d.whatsapp.url,
    whatsappNote: d.whatsapp.note,

    social: d.social,
  };
}

export const SEED_CONTACT_SOURCE = contactSource as ContactSource;
export const SEED_CONTACT: ContactView = deriveContact(SEED_CONTACT_SOURCE);
