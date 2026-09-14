import { useState } from "react";
import LogoHero from "../components/LogoHero";

export function PortalLogin() {
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/public/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("portal_delegate", JSON.stringify(data.delegate));
      window.location.href = "/portal";
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
          <LogoHero size={80} subtitle="Delegate Portal" />
          <p style={{ color: "#6b7a90", fontSize: 13, textAlign: "center", marginTop: 14 }}>Enter your reference number to access your delegate portal</p>
          <input placeholder="Reference Number (e.g. K26-0001-ABCDEF)"
            value={ref} onChange={e => setRef(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ref.trim() && login()}
            style={{ fontFamily: "monospace", letterSpacing: 1 }} />
          {err && <div style={{ color: "#ff3366", fontSize: 13, marginTop: 8 }}>{err}</div>}
          <button className="btn mt" style={{ width: "100%" }} disabled={!ref.trim() || loading} onClick={login}>
            {loading ? "Logging in..." : "Access Portal"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/register" style={{ fontSize: 13, color: "#6b7a90" }}>New delegate? Register here →</a>
        </div>
      </div>
    </div>
  );
}
