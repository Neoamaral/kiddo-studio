/**
 * Turn a password into the value for ADMIN_PASSWORD_HASH.
 *
 *   npm run admin:hash
 *
 * Reads the password from a prompt rather than from argv, so it does not end
 * up in the shell history. Prints only the hash — paste that into Vercel's
 * environment variables. The plaintext is never written anywhere.
 */

import readline from "node:readline";
import { Writable } from "node:stream";
import { hashPassword, verifyPassword } from "../src/lib/admin/auth";

/** A stdout that can swallow the echo while a password is being typed. */
class MutableOut extends Writable {
  muted = false;
  _write(chunk: unknown, _enc: string, cb: () => void) {
    if (!this.muted) process.stdout.write(chunk as Buffer);
    cb();
  }
}

const out = new MutableOut();
const rl = readline.createInterface({
  input: process.stdin,
  output: out,
  terminal: true,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    out.muted = true;
    rl.question("", (answer) => {
      out.muted = false;
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const pw = await ask("New admin password: ");
  const again = await ask("Again: ");
  rl.close();

  if (pw !== again) {
    console.error("\nThey do not match. Nothing written.");
    process.exit(1);
  }
  if (pw.length < 12) {
    console.error(`\nToo short (${pw.length} chars). Use at least 12.`);
    process.exit(1);
  }

  const hash = hashPassword(pw);

  // Prove the hash actually verifies before handing it over — a hash that
  // cannot be checked would lock the panel with no way in.
  if (!verifyPassword(pw, hash)) {
    console.error("\nThe hash did not verify. This is a bug; do not use it.");
    process.exit(1);
  }

  console.log("\nSet this in Vercel (and in .env.local for development):\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  console.log("The password itself is not stored anywhere. Keep it safe.");
}

main();
