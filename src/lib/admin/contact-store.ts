/** The contact details as the admin panel sees them. Same shape as pricing-store.ts. */

import type { ContactSource } from "@/data/types";
import { validateContact } from "@/lib/contact-validate";
import { purgeContact } from "@/lib/data-source";
import { isConfigured, readContact, writeContact } from "./store";
import { SaveRejected } from "./catalogue";

export interface LoadedContact {
  data: ContactSource;
  version: string;
  seeded: boolean;
  readOnly: boolean;
}

export async function loadContact(): Promise<LoadedContact> {
  const { data, version, seeded } = await readContact();
  return { data, version, seeded, readOnly: !isConfigured() };
}

export async function saveContact(opts: {
  data: ContactSource;
  version: string;
}): Promise<{ version: string }> {
  const d = opts.data;

  /*
   * Trimmed before it is validated, not after.
   *
   * A trailing space on the email address passes a regex and then fails
   * delivery, which is the worst of both: the panel says saved and the
   * enquiries stop arriving.
   */
  const next: ContactSource = {
    _meta: {
      source: "Contact details. Written by the Kiddo admin panel.",
      updatedAt: new Date().toISOString(),
    },
    email: d.email.trim(),
    emailNote: d.emailNote.trim(),
    phone: d.phone.trim(),
    phoneNote: d.phoneNote.trim(),
    address: {
      street: d.address.street.trim(),
      postcode: d.address.postcode.trim(),
      city: d.address.city.trim(),
      country: d.address.country.trim(),
    },
    addressNote: d.addressNote.trim(),
    coordinates: { lat: Number(d.coordinates.lat), lon: Number(d.coordinates.lon) },
    whatsapp: {
      handle: d.whatsapp.handle.trim(),
      url: d.whatsapp.url.trim(),
      note: d.whatsapp.note.trim(),
    },
    social: d.social.map((s) => ({
      id: s.id.trim().toLowerCase(),
      label: s.label.trim(),
      handle: s.handle.trim(),
      url: s.url.trim(),
    })),
  };

  const errors = validateContact(next);
  if (errors.length) throw new SaveRejected(errors);

  const version = await writeContact(next, opts.version);
  purgeContact();
  return { version };
}
