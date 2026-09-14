import { useEffect, useState } from "react";
import { portalFetch } from "../portal";

type Guide = { id: number; title: string; description: string; file_url: string; kind: string; committee_id: number | null };

export function PortalStudyGuides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    portalFetch("/api/portal/study-guides").then(setGuides).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ padding: 20, color: "#ff3366" }}>{err}</div>;

  const kindLabel: Record<string, string> = { study_guide: "Study Guide", background_guide: "Background Guide", agenda: "Agenda" };
  const kindColor: Record<string, string> = { study_guide: "#00d4ff", background_guide: "#00d4ff", agenda: "#00ff88" };

  return (
    <div>
      <div className="topbar"><h2 style={{ margin: 0, fontSize: 20 }}>Study Guides</h2></div>
      {guides.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", color: "#6b7a90", padding: 40 }}>
          No study guides available yet. They will appear here after committee allotment.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {guides.map(g => (
            <div key={g.id} className="glass">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="chip" style={{ color: kindColor[g.kind] || "#00d4ff", borderColor: kindColor[g.kind] || "#00d4ff" }}>
                  {kindLabel[g.kind] || g.kind}
                </span>
                {g.file_url && (
                  <a href={g.file_url} target="_blank" rel="noopener" style={{ fontSize: 12 }}>Download ↓</a>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: 13, color: "#6b7a90" }}>{g.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
