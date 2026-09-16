import { useState } from "react";
import { VERCEL_BYPASS } from "../api";
import LogoHero from "../components/LogoHero";

export function DeptPortalLogin() {
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/public/apply/login", {
        method: "POST", headers: { "Content-Type": "application/json", "x-vercel-protection-bypass": VERCEL_BYPASS },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem("dept_token", data.token);
      localStorage.setItem("dept_user", JSON.stringify(data.user));
      window.location.href = "/apply/portal";
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(420px, 100%)" }}>
        <div className="glass">
          <LogoHero size={80} subtitle="Department Portal" />
          <p style={{ color: "#6b7a90", fontSize: 13, textAlign: "center", marginTop: 14 }}>Enter your reference number to access your department portal</p>
          <input placeholder="Reference Number (e.g. KIMV-0001-ABCDEF)"
            value={ref} onChange={e => setRef(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ref.trim() && login()}
            style={{ fontFamily: "monospace", letterSpacing: 1 }} />
          {err && <div style={{ color: "#ff3366", fontSize: 13, marginTop: 8 }}>{err}</div>}
          <button className="btn mt" style={{ width: "100%" }} disabled={!ref.trim() || loading} onClick={login}>
            {loading ? "Logging in..." : "Access Portal"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/apply" style={{ fontSize: 13, color: "#6b7a90" }}>New? Apply as volunteer →</a>
        </div>
      </div>
    </div>
  );
}
