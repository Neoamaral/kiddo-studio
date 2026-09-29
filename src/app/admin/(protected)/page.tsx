import Link from "next/link";
import { getCatalogue, getContact, getPricing } from "@/lib/data-source";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 22,
  textDecoration: "none",
  color: "#1A1A1A",
  display: "block",
};

export default async function AdminHome() {
  const [catalogue, pricing, contact] = await Promise.all([
    getCatalogue(),
    getPricing(),
    getContact(),
  ]);
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
            {catalogue.totalItems}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            items in {catalogue.totalCategories} categories
          </span>
        </Link>

        <Link href="/admin/pricing" style={card}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em" }}>
            PRICING
          </span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1.1 }}>
            {pricing.packages.length}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            studio packages
          </span>
        </Link>

        <Link href="/admin/contact" style={card}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em" }}>
            CONTACT
          </span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.3, marginTop: 6 }}>
            {contact.email}
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            {contact.addressLine} — and where enquiries arrive
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
        Saving publishes straight away — there is no rebuild to wait for. Every
        save also keeps a dated copy, so a change can be undone.
      </p>
    </>
  );
}
