/**
 * Asking Meta whether the connection actually works.
 *
 * This is the whole point of the screen. Anyone can store a pixel id and a
 * token; the question the studio needs answered is whether the two go
 * together, and only Meta can answer it.
 *
 * ONE READ-ONLY CALL, NO SIDE EFFECTS:
 *
 *   GET /v25.0/{pixel}?fields=id,name,last_fired_time&access_token={token}
 *
 * It proves in a single request that the token parses, has not expired, AND is
 * scoped to that specific pixel — the pairing, which is the thing that is
 * actually got wrong. It writes no event, so nothing lands in Events Manager
 * and nothing enters reporting or optimisation.
 *
 * `name` comes back too, so the screen can say "Connected to: Kiddo Studio
 * Pixel" rather than a green tick with no subject, and `last_fired_time` shows
 * whether the BROWSER pixel is alive — which no amount of server-side testing
 * would otherwise reveal.
 *
 * No `import "server-only"`: mapMetaError is pure and is covered by
 * scripts/check-integrations.ts, which server-only throws inside. The token
 * never passes through this module except as an argument from a route that
 * already checked the session.
 */

/**
 * Pinned, never "latest". v25.0 was released 2026-02-18 and Meta guarantees it
 * until 2028-07-29. An unpinned version changes the semantics of a working
 * integration on Meta's schedule rather than ours.
 *
 * Measured and worth knowing: Graph checks the TOKEN before anything else, so
 * a wrong version string ALSO comes back as code 190. That is why the version
 * is printed in the error the screen shows — otherwise a typo here is
 * indistinguishable from a bad token.
 */
export const META_API_VERSION = "v25.0";

export interface MetaProbeOk {
  ok: true;
  pixelId: string;
  /** The dataset name as Meta has it. Null when the send test answered instead. */
  name: string | null;
  /** ISO, or null when the pixel has never fired from a browser. */
  lastFiredAt: string | null;
  /** True when this was proved by sending an event rather than by reading. */
  sentTestEvent?: boolean;
}

export interface MetaProbeFail {
  ok: false;
  /** Shown to the studio. Meta's own words wherever Meta wrote any. */
  message: string;
  /** What to do about it, when there is something to do. */
  hint?: string;
  code: number | null;
  subcode: number | null;
  /** The only thing Meta support will ask for. */
  traceId: string | null;
  /** Printed small, because a version problem presents as a token problem. */
  apiVersion: string;
  /**
   * True when the read test was refused for a reason that the SEND test can
   * still get past — the screen offers the second step instead of a dead end.
   */
  sendTestAvailable?: boolean;
}

export type MetaProbe = MetaProbeOk | MetaProbeFail;

interface GraphError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

/**
 * Graph's error shape to a sentence the studio can act on.
 *
 * Pure, so scripts/check-integrations.ts covers every branch without a
 * network. The shape below is not from memory: a live call with a bad token
 * returns HTTP 400 and
 *   {"error":{"message":"Invalid OAuth access token - Cannot parse access
 *    token","type":"OAuthException","code":190,"fbtrace_id":"…"}}
 */
export function mapMetaError(err: GraphError | undefined, status: number): MetaProbeFail {
  const code = typeof err?.code === "number" ? err.code : null;
  const subcode = typeof err?.error_subcode === "number" ? err.error_subcode : null;
  const traceId = typeof err?.fbtrace_id === "string" ? err.fbtrace_id : null;
  const metaSaid = (err?.message ?? "").trim();
  const base = { code, subcode, traceId, apiVersion: META_API_VERSION, ok: false as const };

  // Meta writes these two for humans whenever it has something human to say.
  if (err?.error_user_title || err?.error_user_msg) {
    return {
      ...base,
      message: err.error_user_title ?? "Meta refused the request.",
      hint: err.error_user_msg,
    };
  }

  if (code === 190) {
    return {
      ...base,
      message: `Meta rejected the token: ${metaSaid || "it could not be read."}`,
      hint:
        subcode === 463
          ? "The token has expired. Generate a fresh one in Events Manager > your dataset > Settings > Conversions API."
          : "Generate a fresh token in Events Manager > your dataset > Settings > Conversions API > Generate access token.",
    };
  }

  if (code === 100 && subcode === 33) {
    return {
      ...base,
      message: "That Pixel ID does not exist, or this token has no access to it.",
      hint: "Check the ID next to the dataset name in Events Manager, and that the token was generated for that same dataset.",
    };
  }

  /*
   * (#100) Missing Permission with NO subcode, from a GET on the pixel node.
   *
   * This is not a broken token and saying "missing permission" to the studio
   * would send them hunting for a setting that does not need changing. A
   * Conversions API token generated in Events Manager is scoped to SEND events
   * to one dataset; reading the dataset's own record needs ads_management,
   * which that token deliberately does not carry.
   *
   * So the read test cannot answer the question for this kind of token, and
   * the honest thing is to say so and name the two ways forward.
   */
  if (code === 100) {
    return {
      ...base,
      message:
        "This token can send events but cannot read the pixel — which is normal for a Conversions API token, and not a fault.",
      hint:
        "Two ways to confirm it works. Either paste a test event code from Events Manager > Test events and press Test again, and I will send a real test event through it. Or regenerate the token choosing \"Set up with the Dataset Quality API\", which also grants read permission to the token you already have.",
      sendTestAvailable: true,
    };
  }

  if (code === 200 || code === 10) {
    return {
      ...base,
      message: "The token is valid but does not have permission for this pixel.",
      hint: "It needs the ads_management permission, and it must belong to the Business that owns the dataset.",
    };
  }

  if (code === 4 || code === 17 || code === 80004) {
    return {
      ...base,
      message: "Too many requests to Meta just now.",
      hint: "Wait a minute and press Test again. Nothing is wrong with the settings.",
    };
  }

  if (code === 1 || code === 2) {
    return {
      ...base,
      message: `Meta is temporarily unavailable${metaSaid ? `: ${metaSaid}` : "."}`,
      hint: "This is on their side. Try again in a minute — do not change anything.",
    };
  }

  if (!err) {
    return { ...base, message: `Meta answered ${status} with nothing this code understands.` };
  }

  return {
    ...base,
    message: `Meta said: ${metaSaid || "an unrecognised error"}${code === null ? "" : ` (code ${code}${err.type ? `, ${err.type}` : ""})`}`,
  };
}

/**
 * The live call. Five seconds and no retry: a retry on a button someone is
 * watching buys nothing and doubles the load on an API that rate-limits.
 */
export async function probePixel(pixelId: string, token: string): Promise<MetaProbe> {
  const url =
    `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(pixelId)}` +
    `?fields=id,name,last_fired_time&access_token=${encodeURIComponent(token)}`;

  let res: Response;
  let body: { id?: string; name?: string; last_fired_time?: string; error?: GraphError };
  try {
    res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    body = (await res.json().catch(() => ({}))) as typeof body;
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      message: timedOut
        ? "Meta did not answer within five seconds."
        : "Could not reach Meta from the server.",
      hint: "Try again. If it keeps happening it is a network problem, not a settings problem.",
      code: null,
      subcode: null,
      traceId: null,
      apiVersion: META_API_VERSION,
    };
  }

  if (!res.ok || body.error) return mapMetaError(body.error, res.status);

  return {
    ok: true,
    pixelId: body.id ?? pixelId,
    name: body.name ?? null,
    lastFiredAt: body.last_fired_time ?? null,
  };
}

/* ── Tier 2: the authoritative round trip ────────────────────────────────── */

/**
 * Sends one event and reports what Meta did with it.
 *
 * This is the test that works for the token the studio actually has. A
 * Conversions API token is scoped to SEND events to one dataset, so asking it
 * to send one is asking it to do the only thing it is for — and a successful
 * send proves the pairing just as well as a read would, with the advantage
 * that the studio can watch it arrive in Events Manager.
 *
 * Every choice in the payload is a decision:
 *
 *   PageView, never Lead or Purchase — a connection test must not be able to
 *   enter attribution or optimisation data.
 *
 *   A synthetic hashed email, not a real person's. Meta requires at least one
 *   customer-information parameter; this is the SHA-256 of a fixed address
 *   belonging to the studio, so it is deterministic, auditable, and not a data
 *   subject.
 *
 *   access_token in the BODY, not the query string, so it cannot end up in an
 *   access log or a proxy trace.
 *
 *   No retry. A retry on a test button is a second real event.
 *
 * `testEventCode` matters more than it looks: with it the event appears under
 * Events Manager > Test events within seconds and is EXCLUDED from reporting
 * and optimisation. Without it, the event counts as one real PageView. The
 * route therefore only calls this with a code, and the screen says why.
 */
export async function sendTestEvent(
  pixelId: string,
  token: string,
  testEventCode: string,
  siteUrl: string
): Promise<MetaProbe> {
  const { createHash, randomBytes } = await import("node:crypto");
  const em = createHash("sha256").update("capi-test@kiddostudio.pt").digest("hex");

  const payload = {
    data: [
      {
        event_name: "PageView",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: siteUrl,
        event_id: `kiddo-capi-test-${randomBytes(8).toString("hex")}`,
        user_data: {
          em: [em],
          client_user_agent: "KiddoStudioAdmin/1.0 (connection test)",
        },
      },
    ],
    test_event_code: testEventCode,
    access_token: token,
  };

  let res: Response;
  let body: { events_received?: number; messages?: unknown[]; fbtrace_id?: string; error?: GraphError };
  try {
    res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(pixelId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      }
    );
    body = (await res.json().catch(() => ({}))) as typeof body;
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      message: timedOut
        ? "Meta did not answer within six seconds."
        : "Could not reach Meta from the server.",
      code: null,
      subcode: null,
      traceId: null,
      apiVersion: META_API_VERSION,
    };
  }

  if (!res.ok || body.error) return mapMetaError(body.error, res.status);

  /*
   * A 200 is not enough. Meta answers 200 with events_received: 0 and a
   * `messages` array when it took the request but refused the event — treating
   * that as success is how a broken integration gets a green tick.
   */
  if (body.events_received !== 1 || (body.messages?.length ?? 0) > 0) {
    return {
      ok: false,
      message: `Meta accepted the request but not the event (received ${body.events_received ?? 0}).`,
      hint: body.messages?.length ? JSON.stringify(body.messages) : undefined,
      code: null,
      subcode: null,
      traceId: body.fbtrace_id ?? null,
      apiVersion: META_API_VERSION,
    };
  }

  return {
    ok: true,
    pixelId,
    name: null,
    lastFiredAt: null,
    sentTestEvent: true,
  };
}
