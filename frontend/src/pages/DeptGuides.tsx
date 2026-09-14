import { useEffect, useState } from "react";
import { deptFetch } from "../deptPortal";

type Guide = { id: number; title: string; description: string; file_url: string; kind: string };

export function DeptGuides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => { deptFetch("/api/apply/portal/guides").then(setGuides).catch(() => {}); }, []);

  const kindLabel: Record<string, string> = { study_guide: "Study Guide", background_guide: "Background Guide", agenda: "Agenda" };

  return (
    <div>
      <div className="topbar"><h2 style={{ margin: 0, fontSize: 20 }}>Guides & Resources</h2></div>
      {guides.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", color: "#6b7a90", padding: 40 }}>No guides available yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {guides.map(g => (
            <div key={g.id} className="glass">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="chip chip-on">{kindLabel[g.kind] || g.kind}</span>
                {g.file_url && <a href={g.file_url} target="_blank" rel="noopener" style={{ fontSize: 12 }}>Download ↓</a>}
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
