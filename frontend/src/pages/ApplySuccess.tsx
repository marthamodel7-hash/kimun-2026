export function ApplySuccess() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(480px, 100%)" }}>
        <div className="glass" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Application Submitted!</div>
          <div style={{ color: "#6b7a90", fontSize: 14, marginBottom: 20 }}>
            Thank you for applying to <strong>KIMUN 2026</strong>.<br />
            We'll review your application and get back to you via email.
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 16, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>What happens next?</div>
            <div style={{ marginBottom: 4 }}>1. Admin reviews your application</div>
            <div style={{ marginBottom: 4 }}>2. If shortlisted, you'll receive an interview invite via email</div>
            <div style={{ marginBottom: 4 }}>3. After interview, you'll receive a selection/rejection email</div>
            <div>4. Selected candidates get a reference number for portal access</div>
          </div>
          <a href="/apply" className="btn ghost" style={{ display: "inline-block" }}>Back to Application</a>
        </div>
      </div>
    </div>
  );
}
