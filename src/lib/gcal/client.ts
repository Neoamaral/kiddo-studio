/**
 * Thin Google Calendar REST client. Same shape as src/lib/magnific.ts:
 * generic get/post, throw on !ok with the body attached.
 */

import { getAccessToken } from "./auth";

const BASE_URL = "https://www.googleapis.com/calendar/v3";

export class GCalError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "GCalError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  init: { query?: Record<string, string | undefined>; body?: unknown } = {}
): Promise<T> {
  const token = await getAccessToken();

  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    const detail =
      (parsed as { error?: { message?: string } } | null)?.error?.message ?? text.slice(0, 300);
    throw new GCalError(res.status, parsed ?? text, `Calendar ${res.status}: ${detail}`);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const gcalGet = <T>(path: string, query?: Record<string, string | undefined>) =>
  request<T>("GET", path, { query });

export const gcalPost = <T>(
  path: string,
  body: unknown,
  query?: Record<string, string | undefined>
) => request<T>("POST", path, { body, query });

export const gcalPatch = <T>(
  path: string,
  body: unknown,
  query?: Record<string, string | undefined>
) => request<T>("PATCH", path, { body, query });

export const gcalDelete = (path: string, query?: Record<string, string | undefined>) =>
  request<void>("DELETE", path, { query });

/* ── Shapes we actually use ──────────────────────────────────────────────── */

export interface CalendarListEntry {
  id: string;
  summary: string;
  timeZone?: string;
  accessRole?: string;
  primary?: boolean;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface FreeBusyResponse {
  calendars: Record<string, { busy: FreeBusySlot[]; errors?: { reason: string }[] }>;
}

export async function listCalendars(): Promise<CalendarListEntry[]> {
  const res = await gcalGet<{ items?: CalendarListEntry[] }>("/users/me/calendarList", {
    maxResults: "250",
    showHidden: "true",
  });
  return res.items ?? [];
}

export async function getCalendar(id: string): Promise<CalendarListEntry> {
  return gcalGet<CalendarListEntry>(`/calendars/${encodeURIComponent(id)}`);
}
