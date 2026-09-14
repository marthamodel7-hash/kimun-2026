import { useEffect, useState } from "react";
import { usePortal, portalFetch } from "../portal";

type Profile = {
  id: number; name: string; email: string; phone: string; institution: string;
  reference: string; registration_type: string; reg_status: string; pay_status: string;
  fee_amount: number; amount_paid: number; committee_id: number | null; country: string;
  badge_url: string; experience_level: string; tshirt_size: string;
  created_at: string;
};

export function PortalProfile() {
  const { delegate, logout } = usePortal();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    portalFetch("/api/portal/profile").then(setProfile).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ padding: 20, color: "#ff3366" }}>{err}</div>;
  if (!profile) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0, fontSize: 20 }}>My Profile</h2>
        <button className="btn ghost" onClick={logout} style={{ fontSize: 12 }}>Logout</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        {/* Profile info */}
        <div className="glass">
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 16px", fontSize: 14 }}>
            <span style={{ color: "#6b7a90" }}>Name</span><span>{profile.name}</span>
            <span style={{ color: "#6b7a90" }}>Email</span><span>{profile.email}</span>
            <span style={{ color: "#6b7a90" }}>Phone</span><span>{profile.phone || "—"}</span>
            <span style={{ color: "#6b7a90" }}>Institution</span><span>{profile.institution || "—"}</span>
            <span style={{ color: "#6b7a90" }}>Experience</span><span>{profile.experience_level?.replace("_", " ")}</span>
            <span style={{ color: "#6b7a90" }}>T-Shirt</span><span>{profile.tshirt_size}</span>
            <span style={{ color: "#6b7a90" }}>Type</span><span>{profile.registration_type}</span>
            <span style={{ color: "#6b7a90" }}>Registered</span><span>{profile.created_at?.slice(0, 10)}</span>
          </div>
        </div>

        {/* Status + QR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="glass" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>Payment Status</div>
            <span className={`pill ${profile.pay_status === "paid" ? "paid" : ""}`} style={{ fontSize: 14 }}>
              {profile.pay_status.toUpperCase()}
            </span>
          </div>
          <div className="glass" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>Registration</div>
            <span className={`pill ${profile.reg_status === "completed" ? "paid" : ""}`} style={{ fontSize: 14 }}>
              {profile.reg_status.toUpperCase()}
            </span>
          </div>
          <div className="glass" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>QR Badge</div>
            {profile.badge_url ? (
              <img src={profile.badge_url} alt="QR Badge" style={{ width: 140, height: 140, borderRadius: 8 }} />
            ) : (
              <div style={{ color: "#6b7a90", fontSize: 13 }}>
                {profile.pay_status === "paid" ? "Badge available after check-in" : "Unlocks after payment"}
              </div>
            )}
          </div>
          <div className="glass" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Reference Number</div>
            <div style={{ fontSize: 14, fontFamily: "monospace", color: "#00d4ff", letterSpacing: 1 }}>{profile.reference}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
