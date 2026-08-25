/**
 * Registers the room calendars with the service account and records their ids
 * in scripts/.sync/gcal.env.
 *
 *   npm run gcal:discover -- --cyc <id> --blk <id>   # first run
 *   npm run gcal:discover                            # afterwards
 *
 * WHY IDS ARE NEEDED ONCE: sharing a calendar with a *person* makes Google add
 * it to their calendar list automatically. A service account never accepts an
 * invitation, so the ACL grant exists but the calendar is not enumerable —
 * calendarList.list comes back empty even when the sharing is perfect.
 *
 * Passing the ids once fixes that permanently: this script calls
 * calendarList.insert, after which the service account can list them like any
 * other calendar and later runs need no arguments.
 */

import fs from "node:fs";
import path from "node:path";
import { getCalendar, gcalPost, listCalendars } from "../src/lib/gcal/client";

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

/** --cyc <id> --blk <id> */
function parseArgs(): { cyc?: string; blk?: string } {
  const out: { cyc?: string; blk?: string } = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cyc") out.cyc = argv[++i];
    else if (argv[i] === "--blk") out.blk = argv[++i];
  }
  return out;
}

/**
 * Add a calendar to the service account's own list so it becomes enumerable.
 * Verifies access first, because calendarList.insert on an unshared calendar
 * succeeds with a useless entry rather than telling you the sharing is missing.
 */
async function register(label: string, id: string): Promise<boolean> {
  try {
    const cal = await getCalendar(id);
    await gcalPost("/users/me/calendarList", { id }).catch(() => {
      /* already registered — harmless */
    });
    console.log(`registered ${label}: "${cal.summary}"`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${label} (${id}): ${msg}`);
    if (msg.includes("404") || msg.includes("Not Found")) {
      console.error(
        `  A 404 means the calendar is not shared with\n` +
          `  ${process.env.GOOGLE_SA_CLIENT_EMAIL}\n` +
          `  — or the id is wrong. Check Settings -> Share with specific people.`
      );
    }
    return false;
  }
}

async function main() {
  const env = loadEnvFile();
  applyEnv(env);

  if (!process.env.GOOGLE_SA_CLIENT_EMAIL) {
    console.error("HALT: no credentials. Run scripts/setup-google-calendar.sh first.");
    process.exit(1);
  }

  const args = parseArgs();
  let registerFailed = false;
  if (args.cyc) registerFailed = !(await register("Cyclorama", args.cyc)) || registerFailed;
  if (args.blk) registerFailed = !(await register("Black Box", args.blk)) || registerFailed;
  if (registerFailed) process.exit(1);
  if (args.cyc || args.blk) console.log();

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
      `\nNot written.\n\n` +
        `If the calendars ARE already shared, pass their ids once — a service\n` +
        `account cannot enumerate a shared calendar until it is registered\n` +
        `(see the header of this file):\n\n` +
        `  npm run gcal:discover -- --cyc <id> --blk <id>\n\n` +
        `Find each id in Calendar -> Settings -> that calendar -> "Integrate\n` +
        `calendar" -> Calendar ID. It looks like ...@group.calendar.google.com\n\n` +
        `Sharing must be with ${process.env.GOOGLE_SA_CLIENT_EMAIL}\n` +
        `at "Make changes and see all event details".`
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
