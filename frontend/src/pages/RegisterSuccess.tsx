import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VERCEL_BYPASS } from "../api";
import LogoHero from "../components/LogoHero";

export function RegisterSuccess() {
  const [params] = useSearchParams();
  const ref = params.get("ref") || "";
  const type = params.get("type") || "individual";
  const count = parseInt(params.get("count") || "1", 10);
  const [screenshot, setScreenshot] = useState<string>("");
  const [txnRef, setTxnRef] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("f", file);
      const r = await fetch("/api/public/upload", { method: "POST", headers: { "x-vercel-protection-bypass": VERCEL_BYPASS }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Upload failed");
      setScreenshot(data.url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submitPayment() {
    setErr("");
    try {
      const r = await fetch("/api/public/payment", {
        method: "POST", headers: { "Content-Type": "application/json", "x-vercel-protection-bypass": VERCEL_BYPASS },
        body: JSON.stringify({ reference: ref, payment_reference: txnRef, screenshot_url: screenshot }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Submission failed");
      setSubmitted(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(520px, 100%)" }}>
        <LogoHero size={90} subtitle="Delegate Registration" />

        {submitted ? (
          <div className="glass" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Payment Proof Submitted!</div>
            <div style={{ color: "#6b7a90", fontSize: 14, marginBottom: 16 }}>
              Awaiting confirmation. Once confirmed, your portal will unlock.
            </div>
            <a href="/portal/login" className="btn" style={{ display: "inline-block" }}>Go to Portal Login</a>
          </div>
        ) : (
          <div className="glass">
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Check Your Email!</div>
            <div style={{ color: "#6b7a90", fontSize: 13, marginBottom: 16 }}>
              A confirmation email with payment details has been sent to your address.
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 4 }}>YOUR REFERENCE NUMBER</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#00d4ff", letterSpacing: 1 }}>{ref}</div>
              <div style={{ fontSize: 11, color: "#6b7a90", marginTop: 4 }}>Use this to log into your delegate portal</div>
            </div>

            <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 }}>Payment Details</div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16, lineHeight: 1.8 }}>
              <div><span style={{ color: "#6b7a90" }}>Bank:</span> Habib Bank Limited (HBL)</div>
              <div><span style={{ color: "#6b7a90" }}>Account Title:</span> KIMUN 2026 Secretariat</div>
              <div><span style={{ color: "#6b7a90" }}>Account No:</span> 1234-5678-9012-3456</div>
              <div><span style={{ color: "#6b7a90" }}>JazzCash:</span> 03XX-XXXXXXX</div>
              <div><span style={{ color: "#6b7a90" }}>Easypaisa:</span> 03XX-XXXXXXX</div>
              <div style={{ marginTop: 6, color: "#00d4ff" }}>
                Fee: Rs. {type === "individual" ? "8,000" : "45,000"}
                {type === "delegation" && count > 1 && ` (${count} delegates)`}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 }}>Upload Payment Screenshot</div>
            <div style={{ marginBottom: 12 }}>
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleUpload} disabled={uploading} />
              {uploading && <div style={{ fontSize: 12, color: "#6b7a90", marginTop: 4 }}>Uploading...</div>}
              {screenshot && <div style={{ fontSize: 12, color: "#00ff88", marginTop: 4 }}>✓ Screenshot uploaded</div>}
            </div>

            <input placeholder="Transaction Reference (optional)" value={txnRef} onChange={e => setTxnRef(e.target.value)} style={{ marginBottom: 12 }} />

            {err && <div style={{ color: "#ff3366", fontSize: 13, marginBottom: 10 }}>{err}</div>}

            <button className="btn" style={{ width: "100%" }} disabled={!screenshot} onClick={submitPayment}>
              Submit Payment Proof
            </button>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <a href="/portal/login" style={{ fontSize: 13, color: "#6b7a90" }}>Skip — I'll pay later →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
