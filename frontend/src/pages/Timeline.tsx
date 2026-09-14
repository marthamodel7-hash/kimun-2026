import { useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err, Empty } from "../components/UI";

const PHASES = ["pre-event", "conference", "post-event"];
const COLORS: Record<string, string> = {
  planned: "rgba(0,212,255,.7)", in_progress: "rgba(0,212,255,.85)",
  completed: "rgba(0,255,136,.8)", blocked: "rgba(255,51,102,.85)", delayed: "rgba(255,170,0,.85)"
};

export function Timeline() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/milestones");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const rows = (data || []).filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const dates = rows.map((m) => m.date);
  const min = dates[0], max = dates[dates.length - 1];
  const span = Math.max(1, dayNum(max) - dayNum(min));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <h2>Master timeline — pre-event → conference → post-event</h2>
      <div className="glass">
        <div className="row">
          <input placeholder="New milestone…" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 280 }} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 170 }} />
          <button className="btn" onClick={async () => {
            if (!name || !date) return toast("Name + date required");
            await api.post("/api/milestones", { name, date, status: "planned", phase: "pre-event" });
            setName(""); setDate(""); reload(); toast("Milestone added");
          }}>+ Add</button>
          <span className="muted">{rows.length} milestones</span>
        </div>
      </div>
      {!rows.length ? <div className="mt"><Empty t="add the first milestone above" /></div> : (
        <div className="glass mt" style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 640 }}>
            <div className="row muted" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span>{min}</span><span style={{ color: "var(--danger)" }}>▼ today {today}</span><span>{max}</span>
            </div>
            {PHASES.map((ph) => (
              <div key={ph}>
                <div className="nav-sec">{ph}</div>
                {rows.filter((m) => (m.phase || "pre-event") === ph).map((m) => {
                  const left = ((dayNum(m.date) - dayNum(min)) / span) * 100;
                  const overdue = m.date < today && m.status !== "completed";
                  return (
                    <div key={m.id} className="row" style={{ margin: "8px 0", gap: 10 }}>
                      <div style={{ width: 200, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={m.name}>
                        {m.status === "completed" ? "✅" : overdue ? "🔴" : "⬜"} {m.name}
                      </div>
                      <div style={{ flex: 1, position: "relative", height: 22, background: "rgba(255,255,255,.05)", borderRadius: 99 }}>
                        <div title={`${m.date} · ${m.owner || "unassigned"} · ${m.status}`}
                          style={{ position: "absolute", left: `calc(${left}% - 8px)`, top: 3, width: 16, height: 16, borderRadius: "50%", background: COLORS[m.status] || COLORS.planned, border: "1px solid var(--border)" }} />
                        {today >= min && today <= max && (
                          <div style={{ position: "absolute", left: `${((dayNum(today) - dayNum(min)) / span) * 100}%`, top: 0, bottom: 0, width: 1, background: "var(--danger)" }} />
                        )}
                      </div>
                      <div className="muted" style={{ width: 90, fontSize: 12 }}>{m.date}</div>
                      <select value={m.status} onChange={async (e) => { await api.put(`/api/milestones/${m.id}`, { status: e.target.value }); reload(); }} style={{ maxWidth: 130 }}>
                        {["planned", "in_progress", "completed", "blocked", "delayed"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/milestones/${m.id}`); reload(); } }}>✕</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function dayNum(d: string) {
  return Math.floor(new Date(d + "T00:00:00").getTime() / 86400000);
}
