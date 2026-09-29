/**
 * Human-facing booking reference.
 *
 * Replaces `KID-${Date.now().toString(36)}`, which was guessable, collided for
 * two submissions in the same millisecond, and — worse — was generated on the
 * CLIENT, so it was attacker-controlled. The server mints it now.
 *
 * Crockford-ish alphabet: no I, L, O or U, so nobody misreads a ref over the
 * phone or accidentally spells something.
 *
 * EIGHT characters, not six. This is the primary key of the requests table now,
 * so a collision is no longer an ambiguous search — it is a rejected insert and
 * a lost booking. Six characters of a 32-symbol alphabet is a billion values,
 * which sounds ample until the birthday bound is applied: at ten thousand
 * lifetime bookings the chance of a clash is about one in twenty. Eight
 * characters take that to roughly one in twenty million, for two more
 * characters on an invoice.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function bookingRef(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `KID-${out}`;
}
