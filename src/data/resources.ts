/**
 * Physical rooms, as distinct from the products sold in the booking flow.
 *
 * There are two rooms. `both` is a PRODUCT that occupies both of them — it is
 * not a third room. Every availability question reduces to one rule:
 *
 *     a product is free  <=>  every resource it occupies is free
 *
 * which produces "booking the cyclorama blocks BOTH but leaves the black box
 * free" with no special case. If you ever need `if (spaceId === "both")`, the
 * model is wrong.
 *
 * Client-safe: no env, no calendar ids. The resource -> Google calendar id map
 * is server-only and lives in src/lib/gcal/.
 */

import type { ResourceId } from "./types";
import { spaceById } from "./spaces";

export interface StudioResource {
  id: ResourceId;
  label: string;
}

export const RESOURCES: readonly StudioResource[] = [
  { id: "room-cyc", label: "Cyclorama" },
  { id: "room-blk", label: "Black Box" },
];

export function resourcesForSpace(spaceId: string | null): readonly ResourceId[] {
  return spaceById(spaceId)?.resourceIds ?? [];
}

export function resourceLabel(id: ResourceId): string {
  return RESOURCES.find((r) => r.id === id)?.label ?? id;
}
