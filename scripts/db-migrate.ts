/**
 * Applies the SQL in db/migrations, in order, once each.
 *
 *   npm run db:migrate            # apply anything outstanding
 *   npm run db:migrate -- --dry   # say what would be applied, change nothing
 *
 * NOT part of `npm run build`, on purpose. The build runs for every preview
 * deployment of every branch, so a migration there would migrate production
 * from a feature branch — and a failed migration would break the build rather
 * than the deploy, which is a far worse place to find out. This is run by hand
 * before publishing, and only ever with additive migrations, so the old code
 * keeps working during the few seconds between the two.
 *
 * Uses the WebSocket Client, not the HTTP driver: the HTTP endpoint rejects
 * multi-statement SQL, and every file here is several statements. A script is
 * also the one place a real connection is appropriate — the objection to
 * connections is about serverless functions being frozen before they close.
 */

import { Client } from "@neondatabase/serverless";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIR = "db/migrations";
const dry = process.argv.includes("--dry");

/*
 * The UNPOOLED url.
 *
 * pg_advisory_lock below is session-level, and PgBouncer in transaction mode
 * hands the session back to the pool between statements — so the lock would be
 * released at unpredictable points and would not actually stop two runners
 * from applying the same migration at once.
 */
const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

async function main(): Promise<void> {
  if (!url) {
    console.error(
      "DATABASE_URL is not set. Put it in .env.local and run with\n" +
        "  npx tsx --env-file=.env.local scripts/db-migrate.ts"
    );
    process.exit(1);
  }
  if (!existsSync(DIR)) {
    console.error(`No ${DIR} directory.`);
    process.exit(1);
  }

  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_, 002_, … so lexicographic order is apply order

  const client = new Client(url);
  await client.connect();

  try {
    await client.query(`
      create table if not exists _migrations (
        name text primary key,
        sha256 text not null,
        applied_at timestamptz not null default now()
      )
    `);

    // Two runners — a person and a deploy script — must not both apply 003.
    await client.query(`select pg_advisory_lock(hashtext('kiddo_migrations'))`);

    const rows = (await client.query(`select name, sha256 from _migrations`))
      .rows as { name: string; sha256: string }[];
    const applied = new Map(rows.map((r) => [r.name, r.sha256]));

    let count = 0;
    for (const file of files) {
      const body = readFileSync(join(DIR, file), "utf8");
      const sha = createHash("sha256").update(body).digest("hex");
      const seen = applied.get(file);

      if (seen === sha) continue;

      /*
       * A migration edited after it was applied means the schema in front of
       * you and the schema this file describes have quietly diverged. Refuse
       * rather than re-run: re-running would fail on `create table` anyway,
       * and skipping would hide the divergence.
       */
      if (seen) {
        throw new Error(
          `${file} has changed since it was applied.\n` +
            `  applied: ${seen}\n  on disk: ${sha}\n` +
            `Write a new migration instead of editing this one.`
        );
      }

      if (dry) {
        console.log(`would apply  ${file}`);
        count++;
        continue;
      }

      // One transaction per file. Postgres DDL is transactional — create
      // table, create index and create extension all roll back — so a file
      // that fails halfway leaves nothing behind.
      await client.query("begin");
      try {
        await client.query(body);
        await client.query(
          `insert into _migrations (name, sha256) values ($1, $2)`,
          [file, sha]
        );
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`${file} failed and was rolled back: ${String(err)}`);
      }
      console.log(`applied      ${file}`);
      count++;
    }

    console.log(
      count === 0
        ? `db-migrate: up to date (${files.length} migration(s) already applied)`
        : `db-migrate: ${dry ? "would apply" : "applied"} ${count} migration(s)`
    );
  } finally {
    // Releases the advisory lock with it.
    await client.end();
  }
}

main().catch((err) => {
  console.error(`db-migrate failed:\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
