"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Sign-in failed");
        setBusy(false);
        return;
      }
      // refresh() so the protected layout re-runs on the server and sees the
      // new cookie; without it the gate would redirect straight back here.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server");
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid rgba(0,0,0,0.25)",
    background: "#fff",
    fontFamily: "var(--font-body)",
    fontSize: 15,
  };
  const label: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(0,0,0,0.55)",
    display: "block",
    marginBottom: 6,
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={label} htmlFor="admin-user">
          Username
        </label>
        <input
          id="admin-user"
          name="username"
          autoComplete="username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={field}
          required
        />
      </div>

      <div>
        <label style={label} htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={field}
          required
        />
      </div>

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#B00020",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 700,
          padding: "14px 20px",
          background: "#C8E820",
          color: "#1A1A1A",
          border: "2px solid #1A1A1A",
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Signing in…" : "Sign in →"}
      </button>
    </form>
  );
}
