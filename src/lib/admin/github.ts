/**
 * Reading and writing the repository through the GitHub contents API.
 *
 * WHY THE REPOSITORY AND NOT A DATABASE
 *
 * The catalogue is a build-time import, and the server reads it as pure
 * synchronous data in quote.ts (pricing a booking) and gcal/availability.ts
 * (stock). Moving it into a database would make all of that async and take the
 * equipment page off static rendering. Writing the file instead leaves the
 * public site exactly as it is, keeps every existing validation, and gives
 * version history and rollback for free.
 *
 * The cost is honest and worth naming: a save is a commit, and the change is
 * live only once Vercel finishes rebuilding — about a minute.
 *
 * THE PANEL READS FROM HERE TOO, not from the bundled import. Straight after a
 * save the running deployment still holds the old data, so reading the import
 * would show the editor the version it just replaced.
 */

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface Config {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

function config(): Config {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set", 500);
  if (!repo || !repo.includes("/")) {
    throw new GitHubError('GITHUB_REPO must look like "owner/name"', 500);
  }
  const [owner, name] = repo.split("/");
  return { token, owner, repo: name, branch: process.env.GITHUB_BRANCH || "master" };
}

async function call(
  path: string,
  init: RequestInit & { method: string }
): Promise<Response> {
  const c = config();
  return fetch(`${API}/repos/${c.owner}/${c.repo}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    // Always hit the API: a cached read would hand back a stale sha and the
    // next write would fail a conflict check it should have passed.
    cache: "no-store",
  });
}

export interface RepoFile {
  /** Decoded UTF-8 contents. */
  text: string;
  /** Blob sha — required to update the file without clobbering someone else. */
  sha: string;
}

/** Reads a text file. Returns null when it does not exist yet. */
export async function readFile(path: string): Promise<RepoFile | null> {
  const c = config();
  const res = await call(`contents/${encodeURI(path)}?ref=${encodeURIComponent(c.branch)}`, {
    method: "GET",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new GitHubError(`Could not read ${path} (${res.status})`, res.status);
  }
  const body = (await res.json()) as { content?: string; sha: string; encoding?: string };
  if (!body.content) throw new GitHubError(`${path} is not a file`, 422);
  return {
    text: Buffer.from(body.content, "base64").toString("utf8"),
    sha: body.sha,
  };
}

export async function readJson<T>(path: string): Promise<{ data: T; sha: string } | null> {
  const file = await readFile(path);
  if (!file) return null;
  try {
    return { data: JSON.parse(file.text) as T, sha: file.sha };
  } catch {
    throw new GitHubError(`${path} in the repository is not valid JSON`, 422);
  }
}

export interface WriteResult {
  /** The new blob sha. */
  sha: string;
  commit: string;
}

/**
 * Creates or replaces a file.
 *
 * `sha` is the blob the edit is based on. GitHub rejects the write when the
 * file has moved on since, which is what turns two people saving at once into
 * a clear error instead of one silently overwriting the other. Omit it only
 * when creating a file that does not exist.
 */
export async function writeFile(opts: {
  path: string;
  content: string | Buffer;
  message: string;
  sha?: string;
}): Promise<WriteResult> {
  const c = config();
  const base64 =
    typeof opts.content === "string"
      ? Buffer.from(opts.content, "utf8").toString("base64")
      : opts.content.toString("base64");

  const res = await call(`contents/${encodeURI(opts.path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: opts.message,
      content: base64,
      branch: c.branch,
      ...(opts.sha ? { sha: opts.sha } : {}),
    }),
  });

  if (res.status === 409 || res.status === 422) {
    throw new GitHubError(
      "Someone else changed this since you loaded the page. Reload and redo your edit.",
      409
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GitHubError(
      `Could not save ${opts.path} (${res.status}) ${detail.slice(0, 200)}`,
      res.status
    );
  }
  const body = (await res.json()) as {
    content: { sha: string };
    commit: { sha: string };
  };
  return { sha: body.content.sha, commit: body.commit.sha };
}

export async function deleteFile(opts: {
  path: string;
  sha: string;
  message: string;
}): Promise<void> {
  const c = config();
  const res = await call(`contents/${encodeURI(opts.path)}`, {
    method: "DELETE",
    body: JSON.stringify({ message: opts.message, sha: opts.sha, branch: c.branch }),
  });
  if (res.status === 404) return; // Already gone; deleting is idempotent.
  if (!res.ok) {
    throw new GitHubError(`Could not delete ${opts.path} (${res.status})`, res.status);
  }
}

/** True when the panel has everything it needs to write. */
export function isConfigured(): boolean {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}
