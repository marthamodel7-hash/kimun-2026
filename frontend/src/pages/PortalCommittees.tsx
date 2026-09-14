import { useEffect, useState } from "react";
import { portalFetch } from "../portal";

type Assigned = { id: number; name: string; type: string; room: string; chair: string; country: string; study_guide_url: string };
type Committee = { id: number; name: string; type: string };

export function PortalCommittees() {
  const [assigned, setAssigned] = useState<Assigned | null>(null);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    portalFetch("/api/portal/committees").then(d => { setAssigned(d.assigned); setCommittees(d.committees); }).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ padding: 20, color: "#ff3366" }}>{err}</div>;

  return (
    <div>
      <div className="topbar"><h2 style={{ margin: 0, fontSize: 20 }}>Committees</h2></div>

      {assigned ? (
        <div className="glass" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Your Committee</div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "6px 16px", fontSize: 14 }}>
            <span style={{ color: "#6b7a90" }}>Committee</span><span style={{ fontWeight: 700 }}>{assigned.name}</span>
            <span style={{ color: "#6b7a90" }}>Type</span><span>{assigned.type}</span>
            <span style={{ color: "#6b7a90" }}>Room</span><span>{assigned.room || "TBD"}</span>
            <span style={{ color: "#6b7a90" }}>Chair</span><span>{assigned.chair || "TBD"}</span>
            <span style={{ color: "#6b7a90" }}>Country</span><span style={{ color: "#00d4ff", fontWeight: 700 }}>{assigned.country}</span>
          </div>
        </div>
      ) : (
        <div className="glass" style={{ textAlign: "center", color: "#6b7a90", padding: 40 }}>
          Committee allotment pending. It will appear here after registration + payment confirmation.
        </div>
      )}

      <div style={{ fontSize: 12, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>All Committees</div>
      <div className="glass">
        {committees.map(c => (
          <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between" }}>
            <span>{c.name}</span>
            <span style={{ color: "#6b7a90", fontSize: 13 }}>{c.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
