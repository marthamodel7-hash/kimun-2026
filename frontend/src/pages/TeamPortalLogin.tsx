/**
 * TeamPortalLogin — Cinematic team member access screen.
 * KIMUN 2026 • INTERNAL OPERATIONS
 */
import { useState, useEffect } from "react";
import { VERCEL_BYPASS } from "../api";
import { useNavigate } from "react-router-dom";

/* ── Palette ── */
const C = {
  bg: "#020305", text: "#e8f0f8", muted: "#8a8070", dim: "#5a5048",
  gold: "#c4a55a", goldLt: "#d4bc7a", goldDk: "#a08840",
  danger: "#ff4d6a", surface: "#080c14",
};

const DEPT_LABELS: Record<string, string> = {
  SEC: "Security Operations", PR: "Public Relations", MED: "Media & Documentation",
  MKT: "Marketing", ORG: "Organizing Committee", ACA: "Academics",
  OUT: "Outreach", TECH: "Technical Assistance", BA: "Brand Ambassadors",
};

/* ── CSS keyframes ── */
const css = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196,165,90,0); }
  50% { box-shadow: 0 0 20px 4px rgba(196,165,90,0.08); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.team-login-input:focus {
  border-color: rgba(196,165,90,0.35) !important;
  box-shadow: 0 0 0 3px rgba(196,165,90,0.06), 0 0 24px rgba(196,165,90,0.04) !important;
}
`;

export function TeamPortalLogin() {
  const nav = useNavigate();
  const [ref, setRef] = useState("");
  const [state, setState] = useState<"idle" | "validating" | "authorized" | "error" | "redirecting">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [authorizedUser, setAuthorizedUser] = useState<{ name: string; reference: string; department_code: string; department_name: string } | null>(null);

  /* If already logged in, redirect */
  useEffect(() => {
    if (localStorage.getItem("team_token")) {
      const raw = localStorage.getItem("team_user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          window.location.href = "/team";
          return;
        } catch {}
      }
    }
  }, []);

  async function handleLogin() {
    if (!ref.trim()) return;
    setState("validating");
    setErrMsg("");
    try {
      const r = await fetch("/api/public/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-vercel-protection-bypass": VERCEL_BYPASS },
        body: JSON.stringify({ reference: ref.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Login failed");
      /* Store auth */
      localStorage.setItem("team_token", data.token);
      localStorage.setItem("team_user", JSON.stringify(data.user));
      setAuthorizedUser(data.user);
      setState("authorized");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Login failed");
      setState("error");
    }
  }

  function handleContinue() {
    setState("redirecting");
    setTimeout(() => { window.location.href = "/team"; }, 600);
  }

  const shakeStyle = state === "error" ? { animation: "shake 0.4s ease" } : {};

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', sans-serif", overflow: "hidden", position: "relative",
    }}>
      <style>{css}</style>

      {/* Atmospheric background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "50%", height: "50%",
          background: "radial-gradient(ellipse at center, rgba(196,165,90,0.03) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "45%", height: "45%",
          background: "radial-gradient(ellipse at center, rgba(160,136,64,0.02) 0%, transparent 65%)", filter: "blur(120px)" }} />
        {/* KIMUN watermark */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "min(500px, 80vw)", height: "min(500px, 80vw)", opacity: 0.015,
          backgroundImage: "url(/kimun-logo.png)", backgroundSize: "contain", backgroundRepeat: "no-repeat",
          backgroundPosition: "center", filter: "grayscale(1)",
        }} />
      </div>

      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%)" }} />

      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", padding: "0 clamp(16px, 3vw, 32px)", height: 64,
        background: "rgba(2,3,5,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.1) 30%, rgba(196,165,90,0.06) 70%, transparent)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/kimun-logo.png" alt="KIMUN" style={{ height: 36, width: 36, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 600, color: C.gold, letterSpacing: 2 }}>KIMUN</div>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "80px 20px 40px",
      }}>
        {/* Login card */}
        <div style={{
          width: "min(480px, 100%)",
          background: "rgba(8,12,22,0.6)",
          border: "1px solid rgba(196,165,90,0.08)",
          borderRadius: 24,
          backdropFilter: "blur(40px) saturate(1.6)", WebkitBackdropFilter: "blur(40px) saturate(1.6)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 100px rgba(196,165,90,0.03), inset 0 1px 0 rgba(255,255,255,0.04)",
          padding: "clamp(32px, 5vw, 48px) clamp(24px, 4vw, 40px) clamp(28px, 4vw, 40px)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Top chrome line */}
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.2), transparent)", pointerEvents: "none" }} />

          {state !== "authorized" && state !== "redirecting" ? (
            /* ── LOGIN FORM ── */
            <div style={{ animation: "fadeInUp 0.6s ease" }}>
              {/* Eyebrow */}
              <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase" as const, color: C.dim, fontWeight: 500, marginBottom: 20 }}>
                KIMUN 2026 &nbsp;•&nbsp; INTERNAL OPERATIONS
              </div>

              {/* Title */}
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px, 6vw, 36px)", fontWeight: 300, lineHeight: 1.05, marginBottom: 6,
                background: "linear-gradient(135deg, #c4a55a 0%, #d4bc7a 50%, #c4a55a 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>TEAM MEMBER</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 7vw, 42px)", fontWeight: 300, lineHeight: 1.05, color: C.text, marginBottom: 20 }}>ACCESS</div>

              {/* Separator */}
              <div style={{ height: 1, background: "linear-gradient(90deg, rgba(196,165,90,0.15), rgba(196,165,90,0.04))", marginBottom: 20 }} />

              {/* Description */}
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
                Secure access for authorized KIMUN team members.
              </p>

              {/* Lock icon */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(196,165,90,0.04)", border: "1px solid rgba(196,165,90,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
              </div>

              {/* Input label */}
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 8 }}>
                UNIQUE REFERENCE NUMBER
              </div>

              {/* Input */}
              <input
                className="team-login-input"
                placeholder="Enter your reference number"
                value={ref}
                onChange={e => { setRef(e.target.value.toUpperCase()); if (state === "error") setState("idle"); }}
                onKeyDown={e => { if (e.key === "Enter" && ref.trim() && state !== "validating") handleLogin(); }}
                disabled={state === "validating"}
                autoFocus
                style={{
                  width: "100%", padding: "13px 16px", fontSize: 15,
                  fontFamily: "'Inter', monospace", letterSpacing: 1.5,
                  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,165,90,0.1)",
                  borderRadius: 12, color: C.text, outline: "none",
                  transition: "all 0.3s",
                  ...shakeStyle,
                }}
              />

              {/* Helper text */}
              <div style={{ fontSize: 11, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
                Your reference number determines your authorized department.
              </div>

              {/* Error */}
              {state === "error" && errMsg && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.15)",
                  fontSize: 12, color: C.danger,
                }}>{errMsg}</div>
              )}

              {/* Submit button */}
              <button
                onClick={handleLogin}
                disabled={!ref.trim() || state === "validating"}
                style={{
                  width: "100%", marginTop: 24, padding: "13px 0",
                  background: ref.trim() && state !== "validating"
                    ? "linear-gradient(135deg, rgba(196,165,90,0.1) 0%, rgba(196,165,90,0.04) 100%)"
                    : "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(196,165,90,0.2)",
                  borderRadius: 12, cursor: ref.trim() && state !== "validating" ? "pointer" : "not-allowed",
                  fontSize: 12, fontWeight: 600, letterSpacing: 2.5,
                  textTransform: "uppercase" as const,
                  color: ref.trim() && state !== "validating" ? C.goldLt : C.dim,
                  transition: "all 0.3s",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={e => { if (ref.trim() && state !== "validating") { e.currentTarget.style.borderColor = "rgba(196,165,90,0.35)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(196,165,90,0.06)"; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {state === "validating" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: `2px solid rgba(196,165,90,0.2)`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                    Validating...
                  </span>
                ) : "ACCESS PORTAL →"}
              </button>

              {/* Footer link */}
              <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C.dim }}>
                Need assistance? <a href="mailto:support@kimun.org" style={{ color: C.gold, textDecoration: "none" }}>Contact support</a>
              </div>
            </div>
          ) : state === "authorized" && authorizedUser ? (
            /* ── AUTHORIZED STATE ── */
            <div style={{ animation: "fadeInUp 0.5s ease", textAlign: "center" }}>
              {/* Checkmark */}
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
                background: "rgba(196,165,90,0.06)", border: "1.5px solid rgba(196,165,90,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "pulse-gold 2s ease-in-out infinite",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 8 }}>
                AUTHORIZED
              </div>

              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: C.text, marginBottom: 4 }}>
                {DEPT_LABELS[authorizedUser.department_code] || authorizedUser.department_name}
              </div>

              <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", marginBottom: 24 }}>
                Reference: {authorizedUser.reference}
              </div>

              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.12), transparent)", marginBottom: 24 }} />

              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase" as const, color: C.dim, marginBottom: 4 }}>
                {DEPT_LABELS[authorizedUser.department_code]?.toUpperCase()} MEMBER PORTAL
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>Access granted.</div>

              <button
                onClick={handleContinue}
                style={{
                  padding: "12px 36px", background: "rgba(196,165,90,0.08)",
                  border: "1px solid rgba(196,165,90,0.2)", borderRadius: 12,
                  cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: 2.5,
                  textTransform: "uppercase" as const, color: C.goldLt,
                  transition: "all 0.3s", fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.4)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(196,165,90,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                Continue →
              </button>
            </div>
          ) : (
            /* ── REDIRECTING STATE ── */
            <div style={{ animation: "fadeInUp 0.4s ease", textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 13, color: C.muted }}>Redirecting to your portal...</div>
            </div>
          )}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
