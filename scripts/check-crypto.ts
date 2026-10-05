/**
 * The secret box, checked without a database.
 *
 * This guards a Meta Conversions API token — a bearer credential with no
 * expiry. The assertions that matter most are the ones about REFUSING: a
 * tampered record must not decrypt, a record written by a different key must
 * be named as such rather than reported as an attack, and a ciphertext moved
 * from one field to another must fail instead of quietly decrypting into the
 * wrong place.
 */

import {
  __resetSecretboxForTests,
  currentKeyId,
  hasSettingsKey,
  open,
  recordKeyId,
  seal,
  SecretKeyError,
  SecretUnreadable,
} from "../src/lib/crypto/secretbox";

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

/** Asserts `fn` throws SecretUnreadable with exactly that reason. */
function unreadable(label: string, reason: string, fn: () => unknown) {
  try {
    fn();
    failures++;
    console.error(`FAIL  ${label}\n      it did not throw`);
  } catch (err) {
    if (!(err instanceof SecretUnreadable)) {
      failures++;
      console.error(`FAIL  ${label}\n      threw ${String(err)} instead of SecretUnreadable`);
      return;
    }
    is(label, err.reason, reason);
  }
}

/** Two fixed keys so the key-rotation case is testable. */
const KEY_A = Buffer.alloc(32, 0xa7).toString("base64");
const KEY_B = Buffer.alloc(32, 0x5c).toString("base64");

function useKey(k: string | undefined) {
  if (k === undefined) delete process.env.SETTINGS_KEY;
  else process.env.SETTINGS_KEY = k;
  __resetSecretboxForTests();
}

const AAD = "kiddo:integrations:meta_capi_token";
const TOKEN = "EAAGm0PX4ZCpsBO1ZC2k9ZBexampleTOKENvalue_with-symbols.and~tilde";

/* ── the happy path ──────────────────────────────────────────────────────── */

useKey(KEY_A);
is("the server reports it has a key", hasSettingsKey(), true);

const sealed = seal(TOKEN, AAD);
is("a sealed record round trips", open(sealed, AAD), TOKEN);
is("the record is v1", sealed.startsWith("v1."), true);
is("it has three dotted parts", sealed.split(".").length, 3);
is("the key id is eight hex characters", /^[0-9a-f]{8}$/.test(sealed.split(".")[1]), true);
is("the key id matches the current key", recordKeyId(sealed), currentKeyId());

// The plaintext must not be sitting in the record in any obvious encoding.
is("the token is not visible in the record", sealed.includes(TOKEN), false);
is("nor base64-encoded inside it",
   sealed.includes(Buffer.from(TOKEN, "utf8").toString("base64")), false);

/* The IV is fresh per call, so sealing the same value twice differs. If this
   ever passes as equal, the IV has become deterministic and GCM is broken. */
is("sealing twice gives different records", seal(TOKEN, AAD) === seal(TOKEN, AAD), false);

is("an empty string round trips", open(seal("", AAD), AAD), "");
const long = "x".repeat(4096);
is("a long token round trips", open(seal(long, AAD), AAD), long);
const unicode = "token-com-acentuação-é-ü-😀";
is("unicode round trips byte for byte", open(seal(unicode, AAD), AAD), unicode);

/* ── refusing ────────────────────────────────────────────────────────────── */

unreadable("a record from another field is refused", "tampered", () =>
  open(sealed, "kiddo:integrations:something_else")
);

/* Flip one bit of the ciphertext. GCM must notice. */
const raw = Buffer.from(sealed.split(".")[2], "base64");
const flipped = Buffer.from(raw);
flipped[flipped.length - 1] ^= 0x01;
unreadable("one flipped bit of ciphertext is refused", "tampered", () =>
  open(`v1.${currentKeyId()}.${flipped.toString("base64")}`, AAD)
);

/* Flip a bit of the auth tag. */
const tagFlipped = Buffer.from(raw);
tagFlipped[12] ^= 0x01;
unreadable("a flipped auth tag is refused", "tampered", () =>
  open(`v1.${currentKeyId()}.${tagFlipped.toString("base64")}`, AAD)
);

for (const [label, bad] of [
  ["empty", ""],
  ["no dots", "justsometext"],
  ["two parts", "v1.abcdef12"],
  ["four parts", `v1.${"ab".repeat(4)}.AAAA.AAAA`],
  ["wrong version", `v2.${"ab".repeat(4)}.AAAA`],
  ["key id too short", "v1.abc.AAAA"],
  ["key id not hex", "v1.zzzzzzzz.AAAA"],
  /*
   * This one must carry the CURRENT key id. The key-id check runs before any
   * crypto, deliberately, so a made-up id would report "key-changed" and never
   * reach the length guard this case exists to exercise.
   */
  ["body too short to hold iv and tag", `v1.${currentKeyId()}.AAAA`],
] as [string, string][]) {
  unreadable(`malformed record refused: ${label}`, "malformed", () => open(bad, AAD));
}

/* ── the key changed ─────────────────────────────────────────────────────── */

const idA = currentKeyId();
useKey(KEY_B);
const idB = currentKeyId();
is("a different key gives a different id", idA === idB, false);

unreadable("a record from the old key is named, not called tampering", "key-changed", () =>
  open(sealed, AAD)
);

/* And the id is still readable without the old key — the property the panel
   depends on to say "paste it again" instead of showing a dead connection. */
is("the old record's key id is still readable", recordKeyId(sealed), idA);

/* ── no key at all ───────────────────────────────────────────────────────── */

useKey(undefined);
is("the server reports it has no key", hasSettingsKey(), false);
try {
  seal("x", AAD);
  failures++;
  console.error("FAIL  sealing without a key did not throw");
} catch (err) {
  is("sealing without a key is a server misconfiguration",
     err instanceof SecretKeyError, true);
  is("and the message names the command that fixes it",
     err instanceof Error && err.message.includes("settings:key"), true);
}

useKey("not-base64-at-all!!!");
try {
  currentKeyId();
  failures++;
  console.error("FAIL  a short key did not throw");
} catch (err) {
  is("a key that is not 32 bytes is refused", err instanceof SecretKeyError, true);
}

useKey(Buffer.alloc(16, 1).toString("base64"));
try {
  currentKeyId();
  failures++;
  console.error("FAIL  a 16-byte key did not throw");
} catch (err) {
  is("a 16-byte key is refused with its length",
     err instanceof Error && err.message.includes("got 16"), true);
}

if (failures) {
  console.error(`\ncheck-crypto: ${failures} failure(s)`);
  process.exit(1);
}
console.log("check-crypto: all assertions passed");
