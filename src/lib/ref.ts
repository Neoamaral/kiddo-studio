/**
 * Human-facing booking reference.
 *
 * Replaces `KID-${Date.now().toString(36)}`, which was guessable, collided for
 * two submissions in the same millisecond, and — worse — was generated on the
 * CLIENT, so it was attacker-controlled. The server mints it now.
 *
 * Crockford-ish alphabet: no I, L, O or U, so nobody misreads a ref over the
 * phone or accidentally spells something.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function bookingRef(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `KID-${out}`;
}
