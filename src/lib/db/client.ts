import "server-only";

/**
 * The database connection.
 *
 * WHY `import "server-only"` AND NOT A COMMENT
 *
 * src/lib/data-source.ts says "SERVER ONLY" in its header and relies on
 * everyone reading it. That was fine for a rate card. This module holds a
 * connection string with a password in it, so the rule is enforced by the
 * compiler instead: importing this from a client component is a build error,
 * not a code review someone skipped.
 *
 * WHY THE HTTP DRIVER AND NEVER A POOL
 *
 * `neon()` is one fetch per query and holds no connection. A `Pool` in a
 * serverless function opens a WebSocket per invocation, and the function is
 * frozen after the response — so `pool.end()` in a `finally` may simply never
 * run. Neon's compute allows on the order of a hundred connections, much of it
 * reserved, and exhausting them presents as a random, unreproducible outage.
 *
 * Nothing here needs an interactive transaction: every write is a single
 * statement using CTEs, which is atomic without any transaction machinery. So
 * the door stays shut. The one exception is scripts/db-migrate.ts, which is a
 * script rather than a function and uses the WebSocket Client deliberately.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Same convention as isCalendarConfigured() and the blob store's
 * isConfigured(): without the database the site degrades rather than falls
 * over, and `npm run dev` with no .env.local still works.
 */
export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

let cached: NeonQueryFunction<false, false> | null = null;

/**
 * Throws when unconfigured rather than returning null, so a caller that forgot
 * to check isDbConfigured() fails loudly at the query instead of quietly
 * writing nothing. Same shape as calendarIdFor().
 */
export function db(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DbError("DATABASE_URL is not set, so nothing can be stored yet.", 503);
  }
  return (cached ??= neon(url));
}

/**
 * The driver types every row as Record<string, any>, so each query site would
 * otherwise carry its own cast. One helper names the expected shape instead.
 *
 * It is an assertion, not a validation: the shape has to match the SELECT
 * list. Column aliases in the SQL and field names here are the contract.
 */
export async function rows<T>(query: PromiseLike<unknown>): Promise<T[]> {
  return (await query) as T[];
}

export class DbError extends Error {
  constructor(
    message: string,
    readonly status: number = 500
  ) {
    super(message);
  }
}

/* ── Error codes worth branching on ──────────────────────────────────────── */

export const PG = {
  /** A unique index was violated. */
  UNIQUE: "23505",
  /** An EXCLUDE constraint was violated — for us, an overlapping hold. */
  EXCLUSION: "23P01",
  CHECK: "23514",
  FOREIGN_KEY: "23503",
} as const;

/**
 * The HTTP driver throws NeonDbError and the WebSocket client throws pg's
 * DatabaseError. Both carry `code`; `constraint` is populated less reliably
 * across versions, so match on the code first.
 */
export function pgCode(err: unknown): string | null {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : null;
}

export function pgConstraint(err: unknown): string | null {
  return typeof err === "object" && err !== null && "constraint" in err
    ? String((err as { constraint: unknown }).constraint)
    : null;
}

/* ── Timeouts ────────────────────────────────────────────────────────────── */

/**
 * Neon's free compute suspends after a few minutes idle and takes up to a few
 * seconds to wake. A low-traffic studio site is idle almost always, so a real
 * share of first visitors pay it — and a slow resume must never hold a
 * function open until the platform kills it.
 *
 * Two budgets, because the two paths have different costs of being wrong: a
 * slow availability read should give up and say "unconfirmed", while a slow
 * booking write is worth waiting longer for before falling back.
 */
export const READ_TIMEOUT_MS = 3_000;
export const WRITE_TIMEOUT_MS = 8_000;

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new DbError(`${label} timed out after ${ms}ms`, 504)),
        ms
      );
    }),
  ]);
}
