"use client";

import { useState } from "react";

export default function ResetPasswordClient({ email, token }: { email: string; token: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "error" | "ok"; msg?: string }>({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !token) {
      setStatus({ kind: "error", msg: "Missing email or token." });
      return;
    }
    if (!pw || pw !== pw2) {
      setStatus({ kind: "error", msg: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/mobile/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "error", msg: data?.error || "Could not reset password." });
        return;
      }
      setStatus({ kind: "ok", msg: "Password updated. You can return to the app and sign in." });
      setPw("");
      setPw2("");
    } catch {
      setStatus({ kind: "error", msg: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F6F8FF", padding: 24, display: "grid", placeItems: "center" }}>
      <section
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 20,
          border: "1px solid rgba(79,124,255,0.18)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
          padding: 22,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0F172A" }}>Reset Password</h1>
        <p style={{ marginTop: 8, marginBottom: 18, color: "#64748B", fontWeight: 600 }}>
          Set a new password for <span style={{ color: "#0F172A" }}>{email || "your account"}</span>.
        </p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1.3, color: "#64748B" }}>
          New Password
        </label>
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          placeholder="8+ chars, upper/lower/number/symbol"
          style={{
            marginTop: 6,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(79,124,255,0.18)",
            background: "#EFF4FF",
            outline: "none",
            fontSize: 16,
          }}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1.3, color: "#64748B" }}>
          Confirm Password
        </label>
        <input
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          type="password"
          placeholder="Re-enter password"
          style={{
            marginTop: 6,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(79,124,255,0.18)",
            background: "#EFF4FF",
            outline: "none",
            fontSize: 16,
          }}
        />

        {status.kind !== "idle" ? (
          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              padding: 12,
              borderRadius: 14,
              fontWeight: 700,
              color: status.kind === "ok" ? "#047857" : "#B91C1C",
              background: status.kind === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            }}
          >
            {status.msg}
          </p>
        ) : null}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#4F7CFF",
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </section>
    </main>
  );
}

