import { useEffect, useState } from "react";
import { useDeptPortal, deptFetch } from "../deptPortal";

type Profile = { id: number; name: string; email: string; phone: string; reference: string; department_id: number; department_name: string; role: string; status: string };

export function DeptProfile() {
  const { user, logout } = useDeptPortal();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { deptFetch("/api/apply/portal/profile").then(setProfile).catch(() => {}); }, []);

  if (!profile) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0, fontSize: 20 }}>My Profile</h2>
        <button className="btn ghost" onClick={logout} style={{ fontSize: 12 }}>Logout</button>
      </div>
      <div className="glass">
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 16px", fontSize: 14 }}>
          <span style={{ color: "#6b7a90" }}>Name</span><span>{profile.name}</span>
          <span style={{ color: "#6b7a90" }}>Email</span><span>{profile.email}</span>
          <span style={{ color: "#6b7a90" }}>Phone</span><span>{profile.phone || "—"}</span>
          <span style={{ color: "#6b7a90" }}>Department</span><span style={{ color: "#00d4ff", fontWeight: 700 }}>{profile.department_name || "Not assigned"}</span>
          <span style={{ color: "#6b7a90" }}>Reference</span><span style={{ fontFamily: "monospace" }}>{profile.reference}</span>
          <span style={{ color: "#6b7a90" }}>Status</span><span className="pill paid">{profile.status.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
