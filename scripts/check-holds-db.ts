/**
 * The half of check-holds that needs a real database.
 *
 * A separate file so the pure half imports nothing from the driver and runs
 * with no environment at all. Loaded dynamically, and only when DATABASE_URL
 * is set.
 *
 * Writes to whatever DATABASE_URL points at, then removes exactly what it
 * created. Point it at a Neon dev branch, never production.
 */

import { Client } from "@neondatabase/serverless";
import { zonedInstant, addDays } from "../src/lib/date";
import { slotById } from "../src/data/booking";

type Check = (label: string, actual: unknown, expected: unknown) => void;

/** Placeholder, replaced once the write layer exists. */
export async function databaseHoldChecks(check: Check): Promise<number> {
  void check;
  void Client;
  void zonedInstant;
  void addDays;
  void slotById;
  return 0;
}
