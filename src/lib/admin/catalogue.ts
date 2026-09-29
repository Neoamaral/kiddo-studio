/**
 * The catalogue as the admin panel sees it: read from the repository, written
 * back only after it passes the same rules the build enforces.
 */

import { EQUIPMENT_BUNDLES } from "@/data/equipment";
import bundled from "@/data/equipment.source.json";
import type { EquipmentSource, EquipmentSourceRow } from "@/data/types";
import { countPhotos, validateCatalogue } from "@/lib/equipment-validate";
import { GitHubError, isConfigured, readJson, writeFile } from "./github";

export const CATALOGUE_PATH = "src/data/equipment.source.json";
export const PHOTO_DIR = "public/images/equipment";

export interface LoadedCatalogue {
  data: EquipmentSource;
  /** Blob sha to send back on save. Null when reading the bundled fallback. */
  sha: string | null;
  /**
   * True when GITHUB_TOKEN is missing. The panel still renders so the UI can
   * be worked on locally, but every save is refused with a clear reason
   * rather than appearing to work.
   */
  readOnly: boolean;
}

export async function loadCatalogue(): Promise<LoadedCatalogue> {
  if (!isConfigured()) {
    return { data: bundled as unknown as EquipmentSource, sha: null, readOnly: true };
  }
  const file = await readJson<EquipmentSource>(CATALOGUE_PATH);
  if (!file) throw new GitHubError(`${CATALOGUE_PATH} is missing from the repository`, 404);
  return { data: file.data, sha: file.sha, readOnly: false };
}

export class SaveRejected extends Error {
  constructor(readonly errors: string[]) {
    super(errors[0] ?? "Invalid");
  }
}

/**
 * Keeps _meta honest about what the rows actually contain.
 *
 * The counts are derived rather than trusted: the validator compares them
 * against the rows and rejects a mismatch, so a panel that shipped its own
 * numbers would just be inventing a way to fail.
 */
function stamp(rows: EquipmentSourceRow[], previous: EquipmentSource): EquipmentSource {
  const data: EquipmentSource = {
    _meta: {
      ...previous._meta,
      source: "Written by the Kiddo admin panel",
      syncedAt: new Date().toISOString(),
      rowCount: rows.length,
      photoCount: 0,
    },
    rows,
  };
  data._meta.photoCount = countPhotos(data);
  return data;
}

export interface SaveOptions {
  rows: EquipmentSourceRow[];
  previous: EquipmentSource;
  sha: string;
  /** Shown in the git history. */
  message: string;
}

/**
 * Validate, then write. Never the other way round — nothing downstream would
 * catch a bad row, and the build would simply fail with the site frozen on the
 * last good deployment.
 */
export async function saveCatalogue(opts: SaveOptions): Promise<{ commit: string }> {
  const next = stamp(opts.rows, opts.previous);

  const { errors } = validateCatalogue(next, EQUIPMENT_BUNDLES);
  if (errors.length) throw new SaveRejected(errors);

  const result = await writeFile({
    path: CATALOGUE_PATH,
    content: JSON.stringify(next, null, 2) + "\n",
    message: opts.message,
    sha: opts.sha,
  });
  return { commit: result.commit };
}

/** "CAM-01" -> "public/images/equipment/cam-01/03.jpg" */
export function photoPath(code: string, index: number, ext = "jpg"): string {
  return `${PHOTO_DIR}/${code.toLowerCase()}/${String(index).padStart(2, "0")}.${ext}`;
}

/** The public src for a repository path under public/. */
export function publicSrc(repoPath: string): string {
  return repoPath.replace(/^public/, "");
}
