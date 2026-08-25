/**
 * Finds the room calendars that have been shared with the service account and
 * writes their ids into scripts/.sync/gcal.env.
 *
 *   npm run gcal:discover
 *
 * This exists so nobody has to hunt for "Integrate calendar -> Calendar ID" in
 * the settings UI and paste an opaque ...@group.calendar.google.com string
 * twice without typos. Sharing the calendar is the only manual step.
 */

import fs from "node:fs";
import path from "node:path";
import { listCalendars } from "../src/lib/gcal/client";

const ENV_PATH = path.join(process.cwd(), "scripts", ".sync", "gcal.env");

/** Which env var a calendar name maps to. Matching is loose on purpose. */
const ROOMS = [
  { key: "GCAL_CAL_ROOM_CYC", label: "Cyclorama", match: /cyclo/i },
  { key: "GCAL_CAL_ROOM_BLK", label: "Black Box", match: /black\s*box|blackbox/i },
];

function loadEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function applyEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) if (v) process.env[k] = v;
}

async function main() {
  const env = loadEnvFile();
  applyEnv(env);

  if (!process.env.GOOGLE_SA_CLIENT_EMAIL) {
    console.error("HALT: no credentials. Run scripts/setup-google-calendar.sh first.");
    process.exit(1);
  }

  const calendars = await listCalendars();
  const writable = calendars.filter((c) => c.accessRole === "writer" || c.accessRole === "owner");

  console.log(`Service account can see ${calendars.length} calendar(s):\n`);
  for (const c of calendars) {
    console.log(`  ${c.summary}`);
    console.log(`    id       ${c.id}`);
    console.log(`    access   ${c.accessRole ?? "?"}`);
    console.log(`    timeZone ${c.timeZone ?? "?"}`);
  }
  if (!calendars.length) {
    console.log("  (none)");
  }
  console.log();

  let missing = false;
  const resolved: Record<string, string> = {};

  for (const room of ROOMS) {
    const hits = writable.filter((c) => room.match.test(c.summary ?? ""));
    if (hits.length === 1) {
      resolved[room.key] = hits[0].id;
      const tz = hits[0].timeZone;
      console.log(`✓ ${room.label} -> ${hits[0].id}`);
      if (tz && tz !== "Europe/Lisbon") {
        // Writes send a wall-clock time plus an explicit zone, so this does not
        // corrupt bookings — but the studio reading the calendar would see the
        // wrong hours, which is its own kind of wrong.
        console.warn(`  WARN  its time zone is ${tz}, not Europe/Lisbon — fix it in Calendar settings`);
      }
    } else if (hits.length === 0) {
      missing = true;
      console.error(`✗ ${room.label}: no writable calendar matching ${room.match}`);
    } else {
      missing = true;
      console.error(
        `✗ ${room.label}: ${hits.length} calendars match ${room.match} — rename so only one does:`
      );
      for (const h of hits) console.error(`    ${h.summary}  (${h.id})`);
    }
  }

  if (missing) {
    console.error(
      `\nNot written. A calendar must be SHARED with\n` +
        `  ${process.env.GOOGLE_SA_CLIENT_EMAIL}\n` +
        `with "Make changes to events", and named so it matches one of the ` +
        `patterns above. See scripts/setup-google-calendar.md step 2.`
    );
    process.exit(1);
  }

  const merged = { ...env, ...resolved };
  const body =
    Object.entries(merged)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  fs.writeFileSync(ENV_PATH, body);

  console.log(`\nWrote both calendar ids into ${path.relative(process.cwd(), ENV_PATH)}.`);
  console.log("Next: npm run gcal:smoke");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
