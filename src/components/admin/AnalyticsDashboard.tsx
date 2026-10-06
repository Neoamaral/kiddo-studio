/**
 * The measurement screen. Reads only — every number here is produced by
 * src/lib/db/analytics.ts and rendered as it arrives.
 *
 * NO CHART LIBRARY. The funnel is seven divs whose widths are percentages, and
 * that is the whole chart. Adding a charting dependency to draw seven bars
 * would be the largest thing in this bundle for the least reason.
 *
 * TWO SOURCES IN ONE FUNNEL, SAID OUT LOUD. The seven steps are counted from
 * browser events, which an ad blocker or a declined banner can suppress. The
 * last two stages are counted from the requests table, which nothing can
 * suppress. That means the submitted count can legitimately be HIGHER than the
 * step before it, and a dashboard that showed those side by side without
 * saying so would be quietly lying. Hence the divider, the labels, and the
 * coverage line.
 */

import Link from "next/link";
import type { Dashboard, NamedCount } from "@/lib/db/analytics";
import { FUNNEL_STEPS } from "@/lib/analytics/events";

const RANGES = [7, 30, 90] as const;

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
};

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 20,
};

const figure: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 34,
  lineHeight: 1.05,
};

const note: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 12,
  color: "rgba(0,0,0,0.55)",
  lineHeight: 1.5,
};

/** Step labels for the screen, keyed off the shared vocabulary. */
const STEP_LABEL: Record<string, string> = {
  space: "Which space",
  package: "Package",
  date: "Date",
  slot: "Time slot",
  addons: "Extras",
  equipment: "Gear",
  details: "Their details",
};

function pct(n: number, of: number): string {
  if (of <= 0) return "—";
  return `${Math.round((n / of) * 100)}%`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <div style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>{label}</div>
      <div style={{ ...figure, marginTop: 8 }}>{value}</div>
      {hint ? <div style={{ ...note, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

/**
 * The funnel rows, in a grid rather than a flex row.
 *
 * ONE MEDIA QUERY, AND IT IS NOT OPTIONAL. The five columns come to 358px of
 * fixed width, and a 390px phone leaves 302px of it once the page and card
 * padding are taken out — measured, not guessed. Below 560px the bar drops to
 * a line of its own instead of the row scrolling sideways.
 *
 * A real stylesheet is used because this screen is a server component: an
 * inline style cannot carry a media query, and turning the whole dashboard
 * into a client component just to read a viewport width would ship JavaScript
 * to do what CSS already does.
 */
const FUNNEL_CSS = `
.kfunnel-row {
  display: grid;
  grid-template-columns: 22px 112px 1fr 42px 84px;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
}
.kfunnel-bar { height: 22px; background: rgba(0,0,0,0.05); min-width: 40px; }
@media (max-width: 560px) {
  .kfunnel-row {
    grid-template-columns: 20px 1fr auto auto;
    gap: 8px;
    row-gap: 5px;
  }
  .kfunnel-bar { grid-column: 1 / -1; grid-row: 2; height: 14px; }
}
`;

/** One funnel row. `of` sets the bar scale, `prev` sets the drop-off figure. */
function Bar({
  rank,
  label,
  sessions,
  of,
  prev,
  server,
}: {
  rank: string;
  label: string;
  sessions: number;
  of: number;
  prev: number | null;
  server?: boolean;
}) {
  const width = of > 0 ? Math.min(Math.max(sessions / of, 0), 1) * 100 : 0;
  const lost = prev !== null && prev > 0 ? prev - sessions : null;
  return (
    <div className="kfunnel-row">
      <div style={{ ...mono, color: "rgba(0,0,0,0.35)" }}>{rank}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>{label}</div>
      <div className="kfunnel-bar">
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: server ? "#1A1A1A" : "#FF4D2E",
          }}
        />
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, textAlign: "right" }}>
        {sessions}
      </div>
      <div style={{ ...mono, minWidth: 74, textAlign: "right", color: "rgba(0,0,0,0.45)" }}>
        {lost !== null && lost > 0 ? `-${lost} (${pct(lost, prev as number)})` : " "}
      </div>
    </div>
  );
}

function Table({ title, rows, empty }: { title: string; rows: NamedCount[]; empty: string }) {
  const top = rows[0]?.count ?? 0;
  return (
    <div style={card}>
      <div style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ ...note, marginTop: 10 }}>{empty}</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 0",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={r.label}
              >
                {r.label}
              </div>
              <div style={{ width: 54, height: 6, background: "rgba(0,0,0,0.06)", flexShrink: 0 }}>
                <div
                  style={{
                    width: `${top > 0 ? (r.count / top) * 100 : 0}%`,
                    height: "100%",
                    background: "rgba(0,0,0,0.45)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  width: 34,
                  textAlign: "right",
                }}
              >
                {r.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({
  data,
  days,
  dbOff,
  failed,
}: {
  data: Dashboard;
  days: number;
  dbOff: boolean;
  failed: string | null;
}) {
  const t = data.totals;

  /*
   * Every declared step is shown, including the ones nobody reached. A funnel
   * with a missing row reads as a funnel with no drop-off there.
   */
  const byIndex = new Map(data.funnel.map((r) => [r.stepIndex, r.sessions]));
  const steps = FUNNEL_STEPS.map((id, i) => ({
    id,
    label: STEP_LABEL[id] ?? id,
    sessions: byIndex.get(i) ?? 0,
  }));
  const entered = steps[0]?.sessions ?? 0;
  const reachedDetails = steps[steps.length - 1]?.sessions ?? 0;

  /*
   * The honesty number: of the bookings the server recorded, how many the
   * browser events also saw. Well under 100% means every count above it is an
   * undercount by roughly the same proportion, and the screen says so.
   */
  const coverage = t.submitted > 0 ? t.submittedSeen / t.submitted : null;

  return (
    <div style={{ padding: "28px 24px 60px", maxWidth: 1180, margin: "0 auto" }}>
      <style>{FUNNEL_CSS}</style>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0 }}>
          How the booking funnel is doing
        </h1>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              style={{
                ...mono,
                padding: "6px 11px",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.2)",
                background: r === days ? "#1A1A1A" : "#fff",
                color: r === days ? "#fff" : "#1A1A1A",
              }}
            >
              {r} days
            </Link>
          ))}
        </div>
      </div>

      {dbOff ? (
        <div style={{ ...card, borderColor: "rgba(0,0,0,0.35)", marginBottom: 18 }}>
          <div style={mono}>No database on this server</div>
          <div style={{ ...note, marginTop: 6 }}>
            Nothing is being measured and nothing is being stored. This screen fills in on
            its own once DATABASE_URL is set.
          </div>
        </div>
      ) : null}

      {failed ? (
        <div style={{ ...card, borderColor: "#FF4D2E", marginBottom: 18 }}>
          <div style={{ ...mono, color: "#FF4D2E" }}>The numbers could not be read</div>
          <div style={{ ...note, marginTop: 6 }}>{failed}</div>
        </div>
      ) : null}

      {/* ── The figures ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Stat
          label="Visits"
          value={String(t.sessions)}
          hint={`${t.pageViews} page views. A visit ends with the browser tab.`}
        />
        <Stat
          label="Opened the booking"
          value={String(entered)}
          hint={t.sessions > 0 ? `${pct(entered, t.sessions)} of visits` : undefined}
        />
        <Stat
          label="Bookings sent"
          value={String(t.submitted)}
          hint="From the bookings table — nothing can block this one."
        />
        <Stat
          label="Confirmed"
          value={String(t.confirmed)}
          hint={t.submitted > 0 ? `${pct(t.confirmed, t.submitted)} of those sent` : undefined}
        />
        <Stat
          label="Confirmed value"
          value={`${Math.round(t.revenueCents / 100)}€`}
          hint="Confirmed and done, VAT included, inside the window."
        />
      </div>

      {/* ── The funnel ───────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 22 }}>
        <div style={{ ...mono, color: "rgba(0,0,0,0.5)" }}>
          Step by step · last {days} days
        </div>
        <div style={{ ...note, marginTop: 6, marginBottom: 14 }}>
          How many <strong>different visits</strong> reached each step. A visit that goes
          back and forth is still counted once per step.
        </div>

        {entered === 0 ? (
          <div style={note}>
            Nobody has opened the booking in this window yet — or the measurement only
            went live after it started. Counting begins the moment someone accepts the
            consent banner, never before.
          </div>
        ) : (
          <>
            {steps.map((s, i) => (
              <Bar
                key={s.id}
                rank={String(i + 1).padStart(2, "0")}
                label={s.label}
                sessions={s.sessions}
                of={entered}
                prev={i === 0 ? null : steps[i - 1].sessions}
              />
            ))}

            <div
              style={{
                borderTop: "1px dashed rgba(0,0,0,0.25)",
                marginTop: 12,
                paddingTop: 12,
              }}
            >
              <div style={{ ...mono, color: "rgba(0,0,0,0.5)", marginBottom: 4 }}>
                Counted on the server, not in the browser
              </div>
              <Bar
                rank="08"
                label="Booking sent"
                sessions={t.submitted}
                of={entered}
                prev={reachedDetails}
                server
              />
              <Bar
                rank="09"
                label="Confirmed"
                sessions={t.confirmed}
                of={entered}
                prev={t.submitted}
                server
              />
            </div>

            <div style={{ ...note, marginTop: 14 }}>
              The two dark bars come from the bookings table. They cannot be blocked, so
              they can read <em>higher</em> than the step above them — that gap is
              measurement loss, not a mistake.
              {coverage !== null ? (
                <>
                  {" In this window the browser events saw "}
                  <strong>{t.submittedSeen}</strong>
                  {" of "}
                  <strong>{t.submitted}</strong>
                  {` bookings (${Math.round(coverage * 100)}%)`}
                  {coverage < 0.75
                    ? " — so read every count above as roughly that share of the truth."
                    : "."}
                </>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* ── The dimensions ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 14,
        }}
      >
        <Table
          title="Where the visits came from"
          rows={data.sources}
          empty="No visits recorded in this window."
        />
        <Table
          title="Most visited pages"
          rows={data.topPages}
          empty="No page views in this window."
        />
        <Table title="Buttons clicked" rows={data.ctas} empty="No button clicks recorded." />
        <Table title="Device" rows={data.devices} empty="No visits recorded." />
        <Table
          title="Gear looked at closely"
          rows={data.gear}
          empty="Nobody opened a gear card in this window."
        />
      </div>

      <div style={{ ...note, marginTop: 20 }}>
        {data.health.events.toLocaleString("en-GB")} events stored in total,{" "}
        {Math.round(data.health.sizeBytes / 1024)} KB on disk. No IP addresses, no
        persistent identifiers and no query strings are recorded — the{" "}
        <Link href="/privacy" style={{ color: "#1A1A1A" }}>
          privacy page
        </Link>{" "}
        says exactly what is.
      </div>
    </div>
  );
}
