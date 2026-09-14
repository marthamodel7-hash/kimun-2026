import { useState, useEffect } from "react";
import LogoHero from "../components/LogoHero";

type Committee = { id: number; name: string; type: string; capacity: number };
type Member = { name: string; email: string; phone: string; institution: string };

const EMPTY_MEMBER: Member = { name: "", email: "", phone: "", institution: "" };
const STEPS = ["Personal Info", "Registration Type", "Committee Preference", "Review"];

export function Register() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [experience, setExperience] = useState("first_timer");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [regType, setRegType] = useState("individual");
  const [members, setMembers] = useState<Member[]>([{ ...EMPTY_MEMBER }]);
  const [headIdx, setHeadIdx] = useState(0);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [prefs, setPrefs] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/committees").then(r => r.json()).then(setCommittees).catch(() => {});
  }, []);

  function addMember() {
    if (members.length < 6) setMembers([...members, { ...EMPTY_MEMBER }]);
  }
  function removeMember(i: number) {
    const next = members.filter((_, idx) => idx !== i);
    setMembers(next);
    if (headIdx >= next.length) setHeadIdx(0);
  }
  function updateMember(i: number, field: keyof Member, val: string) {
    const next = [...members];
    next[i] = { ...next[i], [field]: val };
    setMembers(next);
  }

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name, email, phone, institution,
        experience_level: experience,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        registration_type: regType,
        committee_preferences: prefs,
      };
      if (regType === "delegation") {
        body.delegation_members = members;
        body.head_delegate_index = headIdx;
      }
      const r = await fetch("/api/public/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Registration failed");
      window.location.href = `/register/success?ref=${data.reference}&type=${data.type}&count=${data.delegate_count || 1}`;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const valid1 = name.trim() && email.trim();
  const valid2 = regType === "individual" || (members.length >= 2 && members.every(m => m.name.trim()));
  const valid3 = true;
  const valid = valid1 && valid2 && valid3;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "min(600px, 100%)" }}>
        <LogoHero size={90} subtitle="Delegate Registration" />

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "#00d4ff" : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 1 }}>{STEPS[step]}</div>

        <div className="glass">
          {/* Step 1: Personal Info */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="Email Address *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              <input placeholder="Institution / University" value={institution} onChange={e => setInstitution(e.target.value)} />
              <select value={experience} onChange={e => setExperience(e.target.value)}>
                <option value="first_timer">First Timer</option>
                <option value="intermediate">Intermediate (1-2 MUNs)</option>
                <option value="experienced">Experienced (3+ MUNs)</option>
              </select>
              <input placeholder="Emergency Contact Name" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
              <input placeholder="Emergency Contact Phone" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
            </div>
          )}

          {/* Step 2: Registration Type */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {["individual", "delegation"].map(t => (
                  <button key={t} className={`btn ${regType === t ? "" : "ghost"}`} style={{ flex: 1 }} onClick={() => setRegType(t)}>
                    {t === "individual" ? "Individual Delegate" : "Delegation of 6"}
                  </button>
                ))}
              </div>
              {regType === "individual" && (
                <div style={{ color: "#6b7a90", fontSize: 13 }}>Fee: Rs. 8,000</div>
              )}
              {regType === "delegation" && (
                <>
                  <div style={{ color: "#6b7a90", fontSize: 13 }}>Fee: Rs. 45,000 (Rs. 7,500 per head)</div>
                  {members.map((m, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: "#00d4ff" }}>Delegate {i + 1}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <label style={{ fontSize: 11, color: "#6b7a90" }}>
                            <input type="radio" name="head" checked={headIdx === i} onChange={() => setHeadIdx(i)} /> Head
                          </label>
                          {members.length > 1 && <button onClick={() => removeMember(i)} style={{ background: "none", border: "none", color: "#ff3366", cursor: "pointer", fontSize: 16 }}>×</button>}
                        </div>
                      </div>
                      <input placeholder="Name *" value={m.name} onChange={e => updateMember(i, "name", e.target.value)} style={{ marginBottom: 4 }} />
                      <input placeholder="Email" value={m.email} onChange={e => updateMember(i, "email", e.target.value)} style={{ marginBottom: 4 }} />
                      <input placeholder="Phone" value={m.phone} onChange={e => updateMember(i, "phone", e.target.value)} style={{ marginBottom: 4 }} />
                      <input placeholder="Institution" value={m.institution} onChange={e => updateMember(i, "institution", e.target.value)} />
                    </div>
                  ))}
                  {members.length < 6 && <button className="btn ghost" onClick={addMember}>+ Add Delegate ({members.length}/6)</button>}
                </>
              )}
            </div>
          )}

          {/* Step 3: Committee Preference */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#6b7a90" }}>Select your top committee preferences (comma-separated):</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {committees.map(c => (
                  <button key={c.id} className={`chip ${prefs.includes(c.name) ? "chip-on" : ""}`}
                    onClick={() => {
                      const list = prefs.split(",").map(s => s.trim()).filter(Boolean);
                      if (list.includes(c.name)) setPrefs(list.filter(x => x !== c.name).join(", "));
                      else setPrefs([...list, c.name].join(", "));
                    }}>{c.name}</button>
                ))}
              </div>
              <input placeholder="Or type preferences: UNGA, UNSC, WHO" value={prefs} onChange={e => setPrefs(e.target.value)} />
              <div style={{ fontSize: 12, color: "#6b7a90" }}>Committee allotment happens after registration + payment confirmation.</div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "6px 12px" }}>
                <span style={{ color: "#6b7a90" }}>Name</span><span>{name}</span>
                <span style={{ color: "#6b7a90" }}>Email</span><span>{email}</span>
                <span style={{ color: "#6b7a90" }}>Phone</span><span>{phone || "—"}</span>
                <span style={{ color: "#6b7a90" }}>Institution</span><span>{institution || "—"}</span>
                <span style={{ color: "#6b7a90" }}>Experience</span><span>{experience.replace("_", " ")}</span>
                <span style={{ color: "#6b7a90" }}>Type</span><span>{regType === "individual" ? "Individual" : `Delegation (${members.length})`}</span>
                <span style={{ color: "#6b7a90" }}>Fee</span><span style={{ color: "#00d4ff" }}>Rs. {regType === "individual" ? "8,000" : "45,000"}</span>
                <span style={{ color: "#6b7a90" }}>Preferences</span><span>{prefs || "—"}</span>
              </div>
              {regType === "delegation" && members.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 4 }}>DELEGATES</div>
                  {members.map((m, i) => (
                    <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {i === headIdx && <span style={{ color: "#00d4ff", fontSize: 11, marginRight: 6 }}>HEAD</span>}
                      {m.name || `Delegate ${i + 1}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {err && <div style={{ color: "#ff3366", fontSize: 13, marginTop: 10 }}>{err}</div>}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button> : <div />}
            {step < 3 ? (
              <button className="btn" disabled={!valid} onClick={() => setStep(step + 1)}>Next</button>
            ) : (
              <button className="btn" disabled={loading || !valid} onClick={submit}>
                {loading ? "Registering..." : "Submit Registration"}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/portal/login" style={{ fontSize: 13, color: "#6b7a90" }}>Already registered? Log in to your portal →</a>
        </div>
      </div>
    </div>
  );
}
