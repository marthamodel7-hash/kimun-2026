import { useState, useRef } from "react";
import LogoHero from "../components/LogoHero";

const DEPTS = ["Security", "PR", "Media", "Marketing", "Organizing", "Academics", "Outreach", "Technical", "Brand Ambassadors"];

export function Apply() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [experience, setExperience] = useState("");
  const [dept, setDept] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(file: File) {
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("f", file);
      const r = await fetch("/api/public/apply/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Upload failed");
      setPhotoUrl(data.url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setPhotoPreview("");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhoto(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handlePhoto(f);
  }

  async function submit() {
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/public/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, city, photo_url: photoUrl, experience, department_preference: dept }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Application failed");
      window.location.href = "/";
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Application failed");
    } finally {
      setLoading(false);
    }
  }

  const valid = name.trim() && email.trim() && dept;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(520px, 100%)" }}>
        <LogoHero size={96} subtitle="Volunteer Application" />

        <div className="glass">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* ── Name ── */}
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* ── Phone ── */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input placeholder="+92 3XX XXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            {/* ── Email ── */}
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            {/* ── City ── */}
            <div>
              <label style={labelStyle}>Residence / City</label>
              <input placeholder="Karachi, Lahore, Islamabad..." value={city} onChange={e => setCity(e.target.value)} />
            </div>

            {/* ── Experience ── */}
            <div>
              <label style={labelStyle}>MUN / Organizational Experience</label>
              <textarea placeholder="Tell us about your experience..." value={experience} onChange={e => setExperience(e.target.value)}
                style={{ minHeight: 80, resize: "vertical" }} />
            </div>

            {/* ── Department Picker ── */}
            <div>
              <label style={labelStyle}>Department Interested In *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DEPTS.map(d => {
                  const active = dept === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDept(d)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        letterSpacing: 0.3,
                        color: active ? "#fff" : "#7a8a9e",
                        background: active ? "rgba(0,212,255,0.12)" : "transparent",
                        border: active
                          ? "1px solid rgba(0,212,255,0.4)"
                          : "1px solid rgba(255,255,255,0.08)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Photo Upload ── */}
            <div>
              <label style={labelStyle}>Picture</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: dragOver
                    ? "2px dashed rgba(0,212,255,0.6)"
                    : photoUrl
                      ? "1px solid rgba(0,255,136,0.3)"
                      : "1px dashed rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: photoUrl ? 12 : "28px 16px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  background: dragOver
                    ? "rgba(0,212,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                  disabled={uploading}
                />

                {photoUrl && photoPreview ? (
                  /* ── Preview state ── */
                  <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                        width: 64, height: 64, borderRadius: 14,
                        objectFit: "cover",
                        border: "2px solid rgba(0,255,136,0.3)",
                        boxShadow: "0 0 20px rgba(0,255,136,0.1)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#00ff88", marginBottom: 2 }}>✓ Photo uploaded</div>
                      <div style={{ fontSize: 11, color: "#5e6d82" }}>Click to replace</div>
                    </div>
                    <div style={{
                      padding: "6px 12px", borderRadius: 10,
                      background: "rgba(0,255,136,0.08)",
                      border: "1px solid rgba(0,255,136,0.2)",
                      fontSize: 11, color: "#00ff88", fontWeight: 600,
                    }}>Change</div>
                  </div>
                ) : (
                  /* ── Empty state ── */
                  <>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      display: "grid", placeItems: "center",
                      background: "rgba(0,212,255,0.06)",
                      border: "1px solid rgba(0,212,255,0.15)",
                    }}>
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(0,212,255,0.6)" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#c8d4e0" }}>
                      {uploading ? "Uploading..." : "Drop your photo here"}
                    </div>
                    <div style={{ fontSize: 11, color: "#5e6d82" }}>
                      or click to browse · PNG, JPG, WebP · Max 5MB
                    </div>
                  </>
                )}

                {/* Upload progress shimmer */}
                {uploading && (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                    background: "linear-gradient(90deg, transparent, #c4a55a, transparent)",
                    backgroundSize: "200% 100%",
                    animation: "bar-shimmer 1s linear infinite",
                  }} />
                )}
              </div>
            </div>
          </div>

          {err && <div style={{ color: "#ff3366", fontSize: 13, marginTop: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(255,51,102,0.06)", border: "1px solid rgba(255,51,102,0.15)" }}>{err}</div>}

          <div style={{ fontSize: 11, color: "#5e6d82", marginTop: 10, lineHeight: 1.6 }}>
            By submitting, you agree to KIMUN's <a href="/terms" target="_blank" rel="noopener" style={{ color: "#c4a55a", textDecoration: "underline" }}>Terms &amp; Conditions</a>, <a href="/privacy" target="_blank" rel="noopener" style={{ color: "#c4a55a", textDecoration: "underline" }}>Privacy Policy</a>, and <a href="/equity" target="_blank" rel="noopener" style={{ color: "#c4a55a", textDecoration: "underline" }}>Equity &amp; Inclusion Policy</a>.
          </div>

          <button className="btn mt" style={{ width: "100%", padding: "12px 18px" }} disabled={!valid || loading} onClick={submit}>
            {loading ? "Submitting..." : "Submit Application →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#5e6d82",
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 6,
};
