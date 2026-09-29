import { redirect } from "next/navigation";
import { currentSession } from "@/lib/admin/session";
import LoginForm from "@/components/admin/LoginForm";

/** Reads a cookie, so it cannot be prerendered. */
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Already signed in? Skip the form rather than showing it pointlessly.
  if (await currentSession()) redirect("/admin");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 34,
            lineHeight: 1,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          KIDDO ADMIN
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.45)",
            marginBottom: 28,
          }}
        >
          Equipment and pricing
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
