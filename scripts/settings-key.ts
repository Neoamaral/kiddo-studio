/**
 * Generates SETTINGS_KEY.
 *
 *   npm run settings:key
 *
 * Mirrors `npm run admin:hash`: prints one line to paste into the environment
 * and keeps the secret out of the repository.
 *
 * 32 RANDOM bytes, never a phrase someone chose. HKDF derives a key, it does
 * not stretch a password — a memorable phrase here could be ground offline
 * from a database dump, which is exactly the dump this key exists to survive.
 */

import crypto from "node:crypto";

const key = crypto.randomBytes(32).toString("base64");

console.log();
console.log("  SETTINGS_KEY=" + key);
console.log();
console.log("  Paste that into Vercel (Project > Settings > Environment Variables)");
console.log("  and into .env.local for local work. Then redeploy once.");
console.log();
console.log("  KEEP IT. Rotating it makes every token already saved in the panel");
console.log("  unreadable — on purpose, and the panel will say so in words rather");
console.log("  than quietly stopping. You would have to paste the tokens again.");
console.log();
