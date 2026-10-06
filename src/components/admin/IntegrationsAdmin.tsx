"use client";

/**
 * CONNECTIONS — where the studio links Meta and Google themselves.
 *
 * Same arrangement as ContactAdmin: GET on mount, PUT { data, version }, 409
 * when someone else saved, re-GET afterwards to pick up the new version.
 *
 * THE TOKEN IS WRITE-ONLY HERE. The screen never receives it, not even
 * masked — it receives a TokenState describing it. The input starts empty and
 * an untouched input sends nothing, so saving the page does not silently
 * rewrite a credential nobody meant to change.
 *
 * The asymmetry between Meta and Google is deliberate and stated on screen.
 * Meta can be tested: one Graph call proves the token and the pixel belong
 * together. Google cannot: googletagmanager.com returns a full container for a
 * made-up ID, and the GA4 debug endpoint reports a fabricated measurement id
 * AND a fabricated secret as valid. Both measured. A Test button built on
 * either would print "connected" for a typo, which is worse than no button.
 */

import { useCallback, useEffect, useState } from "react";
import { Banner, Button, Label, box, field, grid, mono } from "./ui";
import type { IntegrationsView, TokenState } from "@/lib/integrations/types";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; details?: string[] };

type TestState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; name: string | null; pixelId: string; lastFiredAt: string | null }
  | { kind: "fail"; message: string; hint?: string; traceId: string | null; apiVersion: string };

const EMPTY: IntegrationsView = {
  metaPixelId: "",
  metaTestEventCode: "",
  metaEnabled: false,
  googleTagId: "",
  googleEnabled: false,
  token: { kind: "absent" },
  updatedAt: "",
  updatedBy: null,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...box, marginBottom: 18 }}>
      <div style={{ ...mono, color: "rgba(0,0,0,0.45)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onChange,
  label,
}: {
  on: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span style={{ ...mono, color: "#1A1A1A" }}>{label}</span>
    </label>
  );
}

/** What the panel says about the stored token, never the token itself. */
function TokenBanner({ state }: { state: TokenState }) {
  if (state.kind === "ok") {
    return (
      <Banner tone="ok">
        A Conversions API token is stored and readable.{" "}
        <span style={{ ...mono, fontSize: 9 }}>KEY {state.keyId}</span>
      </Banner>
    );
  }
  if (state.kind === "no-key") {
    return (
      <Banner tone="error">
        <strong>This server has no encryption key.</strong> A token cannot be stored or read
        until <code>SETTINGS_KEY</code> is set in the environment. Pasting the token again
        will not help — this one is for whoever manages the deployment.
      </Banner>
    );
  }
  if (state.kind === "unreadable") {
    return (
      <Banner tone="error">
        <strong>Server-side events are switched off.</strong>{" "}
        {state.reason === "key-changed" ? (
          <>
            The saved token was encrypted with a different key and can no longer be read.
            Nothing was lost on Meta&apos;s side — generate or paste the token again below and
            press Test.{" "}
            <span style={{ ...mono, fontSize: 9 }}>WRITTEN WITH KEY {state.keyId}</span>
          </>
        ) : (
          <>
            The saved token could not be read ({state.reason}). Paste it again below and press
            Test.
          </>
        )}
      </Banner>
    );
  }
  return null;
}

export default function IntegrationsAdmin() {
  const [data, setData] = useState<IntegrationsView>(EMPTY);
  const [version, setVersion] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Empty means "not touched". Only sent when it has been typed into. */
  const [token, setToken] = useState("");
  const [tokenTouched, setTokenTouched] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/integrations");
      const body = (await res.json().catch(() => ({}))) as {
        data?: IntegrationsView;
        readOnly?: boolean;
        error?: string;
      };
      if (!res.ok || !body.data) {
        setLoadError(body.error ?? "Could not load the connections.");
        return;
      }
      setLoadError(null);
      setData(body.data);
      setVersion(body.data.updatedAt);
      setReadOnly(body.readOnly !== false);
      setDirty(false);
      setToken("");
      setTokenTouched(false);
    } catch {
      setLoadError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof IntegrationsView>(k: K, v: IntegrationsView[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setDirty(true);
    setStatus({ kind: "idle" });
  };

  const save = async () => {
    setStatus({ kind: "saving" });
    const payload: Record<string, unknown> = {
      metaPixelId: data.metaPixelId,
      metaTestEventCode: data.metaTestEventCode,
      metaEnabled: data.metaEnabled,
      googleTagId: data.googleTagId,
      googleEnabled: data.googleEnabled,
    };
    // Present only when typed into. Absent means "leave the stored one alone";
    // an empty string means "delete it".
    if (tokenTouched) payload.metaCapiToken = token;

    try {
      const res = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload, version }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] };
      if (!res.ok) {
        setStatus({ kind: "error", message: body.error ?? "Save failed", details: body.errors });
        return;
      }
      setStatus({ kind: "saved" });
      void load();
    } catch {
      setStatus({ kind: "error", message: "Could not reach the server." });
    }
  };

  const runTest = async () => {
    setTest({ kind: "running" });
    try {
      const res = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The typed token when there is one, so a token can be checked before
        // it is committed; otherwise the server uses the stored one.
        body: JSON.stringify({ pixelId: data.metaPixelId, token: tokenTouched ? token : "" }),
      });
      const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (b.ok === true) {
        setTest({
          kind: "ok",
          name: (b.name as string) ?? null,
          pixelId: (b.pixelId as string) ?? data.metaPixelId,
          lastFiredAt: (b.lastFiredAt as string) ?? null,
        });
      } else {
        setTest({
          kind: "fail",
          message: (b.message as string) ?? "Meta did not accept the request.",
          hint: b.hint as string | undefined,
          traceId: (b.traceId as string) ?? null,
          apiVersion: (b.apiVersion as string) ?? "",
        });
      }
    } catch {
      setTest({
        kind: "fail",
        message: "Could not reach the server.",
        traceId: null,
        apiVersion: "",
      });
    }
  };

  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Connections
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "rgba(0,0,0,0.55)",
          lineHeight: 1.7,
          marginBottom: 20,
          maxWidth: 620,
        }}
      >
        Paste the ids here and they take effect on the next page load — no deploy, no
        developer. Nothing loads for a visitor who declined marketing cookies, whatever is
        switched on below.
      </p>

      {loadError && <Banner tone="error">{loadError}</Banner>}
      {readOnly && !loadError && (
        <Banner tone="info">
          The database is not connected, so nothing can be saved here yet.
        </Banner>
      )}
      {status.kind === "saved" && <Banner tone="ok">Saved. Live on the next page load.</Banner>}
      {status.kind === "error" && (
        <Banner tone="error">
          {status.message}
          {status.details && status.details.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {status.details.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Banner>
      )}

      {/* ── META ─────────────────────────────────────────────────────────── */}
      <Section title="META · PIXEL + CONVERSIONS API">
        <TokenBanner state={data.token} />

        <div style={{ ...grid(260), marginBottom: 14 }}>
          <div>
            <Label>Pixel ID</Label>
            <input
              style={field}
              value={data.metaPixelId}
              disabled={readOnly}
              inputMode="numeric"
              placeholder="1234567890123456"
              onChange={(e) => set("metaPixelId", e.target.value)}
            />
            <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", marginTop: 5 }}>
              EVENTS MANAGER &gt; YOUR DATASET &gt; THE NUMBER BESIDE THE NAME
            </p>
          </div>

          <div>
            <Label>Test event code (optional)</Label>
            <input
              style={field}
              value={data.metaTestEventCode}
              disabled={readOnly}
              placeholder="TEST12345"
              onChange={(e) => set("metaTestEventCode", e.target.value)}
            />
            {data.metaTestEventCode.trim() ? (
              <p style={{ ...mono, fontSize: 9, color: "#B00020", marginTop: 5 }}>
                WHILE THIS IS SET, EVENTS DO NOT COUNT IN REPORTING. CLEAR IT WHEN DONE.
              </p>
            ) : (
              <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", marginTop: 5 }}>
                ONLY WHILE YOU ARE TESTING, FROM EVENTS MANAGER &gt; TEST EVENTS
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>
            Conversions API token{" "}
            {data.token.kind === "ok" ? "— one is stored; type here only to replace it" : ""}
          </Label>
          <input
            style={field}
            type="password"
            autoComplete="off"
            value={token}
            disabled={readOnly}
            placeholder={data.token.kind === "ok" ? "•••••••• stored" : "EAA…"}
            onChange={(e) => {
              setToken(e.target.value);
              setTokenTouched(true);
              setDirty(true);
              setStatus({ kind: "idle" });
            }}
          />
          <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", marginTop: 5 }}>
            STORED ENCRYPTED. IT IS NEVER SENT BACK TO THIS SCREEN, SO IT CANNOT BE READ HERE
            AGAIN — ONLY REPLACED.
            {tokenTouched && token === "" && (
              <span style={{ color: "#B00020" }}> &nbsp;SAVING NOW WILL DELETE THE STORED TOKEN.</span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Toggle
            on={data.metaEnabled}
            disabled={readOnly}
            onChange={(v) => set("metaEnabled", v)}
            label="Load the pixel on the site"
          />
          <Button onClick={runTest} disabled={test.kind === "running" || !data.metaPixelId.trim()}>
            {test.kind === "running" ? "Asking Meta…" : "Test connection"}
          </Button>
        </div>

        {test.kind === "ok" && (
          <div style={{ marginTop: 12 }}>
            <Banner tone="ok">
              <strong>Connected{test.name ? ` to: ${test.name}` : ""}.</strong> Meta recognises
              this token for pixel {test.pixelId}.
              <br />
              <span style={{ ...mono, fontSize: 9 }}>
                LAST BROWSER EVENT:{" "}
                {test.lastFiredAt
                  ? new Date(test.lastFiredAt).toLocaleString()
                  : "NEVER — THE PIXEL HAS NOT FIRED YET"}
              </span>
            </Banner>
          </div>
        )}
        {test.kind === "fail" && (
          <div style={{ marginTop: 12 }}>
            <Banner tone="error">
              {test.message}
              {test.hint && (
                <>
                  <br />
                  {test.hint}
                </>
              )}
              {(test.traceId || test.apiVersion) && (
                <>
                  <br />
                  <span style={{ ...mono, fontSize: 9, opacity: 0.7 }}>
                    {test.apiVersion && `API ${test.apiVersion}`}
                    {test.traceId && ` · TRACE ${test.traceId}`}
                  </span>
                </>
              )}
            </Banner>
          </div>
        )}
      </Section>

      {/* ── GOOGLE ───────────────────────────────────────────────────────── */}
      <Section title="GOOGLE · ANALYTICS OR ADS">
        <div style={{ maxWidth: 360, marginBottom: 14 }}>
          <Label>Tag ID</Label>
          <input
            style={field}
            value={data.googleTagId}
            disabled={readOnly}
            placeholder="G-ABC123XYZ"
            onChange={(e) => set("googleTagId", e.target.value.toUpperCase())}
          />
          <p style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)", marginTop: 5 }}>
            G- FOR ANALYTICS 4 · AW- FOR ADS · UA- NO LONGER WORKS
          </p>
        </div>

        <Toggle
          on={data.googleEnabled}
          disabled={readOnly}
          onChange={(v) => set("googleEnabled", v)}
          label="Load the Google tag on the site"
        />

        <div style={{ marginTop: 14 }}>
          <Banner tone="info">
            <strong>There is no Test button here, on purpose.</strong> Google serves a full tag
            for an ID that does not exist, and its debug endpoint reports a made-up ID as
            valid — both measured. A button built on either would show a green tick for a
            typo, which is worse than no button.
            <br />
            <br />
            To check it for real: accept marketing cookies, open the site in another tab, then
            look at <strong>Analytics &gt; Reports &gt; Realtime</strong>. You should appear
            within about 30 seconds.
            <br />
            <span style={{ ...mono, fontSize: 9, opacity: 0.75 }}>
              THE TAG NEVER LOADS INSIDE THIS PANEL — /ADMIN IS EXCLUDED FROM TRACKING ON
              PURPOSE.
            </span>
          </Banner>
        </div>
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Button
          kind="primary"
          onClick={save}
          disabled={readOnly || !dirty || status.kind === "saving"}
        >
          {status.kind === "saving" ? "Saving…" : "Save connections"}
        </Button>
        {data.updatedAt && (
          <span style={{ ...mono, fontSize: 9, color: "rgba(0,0,0,0.4)" }}>
            LAST SAVED {new Date(data.updatedAt).toLocaleString()}
            {data.updatedBy ? ` BY ${data.updatedBy.toUpperCase()}` : ""}
          </span>
        )}
      </div>
    </>
  );
}
