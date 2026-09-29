import Link from "next/link";
import { EQUIPMENT_CATALOGUE, TOTAL_ITEMS } from "@/data/equipment";
import { PACKAGES } from "@/data/pricing";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 22,
  textDecoration: "none",
  color: "#1A1A1A",
  display: "block",
};

export default function AdminHome() {
  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Overview
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 14,
        }}
      >
        <Link href="/admin/equipment" style={card}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em" }}>
            EQUIPMENT
          </span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1.1 }}>
            {TOTAL_ITEMS}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            items in {EQUIPMENT_CATALOGUE.length} categories
          </span>
        </Link>

        <Link href="/admin/pricing" style={card}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em" }}>
            PRICING
          </span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1.1 }}>
            {PACKAGES.length}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            studio packages
          </span>
        </Link>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "rgba(0,0,0,0.55)",
          lineHeight: 1.7,
          marginTop: 26,
          maxWidth: 560,
        }}
      >
        Saving writes to the repository and the site rebuilds itself. Changes go
        live about a minute later — the page you are reading keeps showing the
        version that is currently deployed.
      </p>
    </>
  );
}
