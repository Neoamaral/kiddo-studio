import { redirect } from "next/navigation";
import { currentSession } from "@/lib/admin/session";
import LoginForm from "@/components/admin/LoginForm";
import { KiddoLogo } from "@/components/ui/KiddoLogo";

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
        {/* The real wordmark, not the name typeset in the display font. */}
        <div style={{ marginBottom: 10 }}>
          <KiddoLogo color="black" height={52} decorative />
        </div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.45)",
            fontWeight: 400,
            marginBottom: 28,
          }}
        >
          {/* What the panel covers. It said "Equipment and pricing", which has
              been out of date since the board, the calendar and the client
              records arrived. Four items wrapped onto a second line at this
              width, so it names the three that are the daily work. */}
          Requests · Calendar · Clients
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
