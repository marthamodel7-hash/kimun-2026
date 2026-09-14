import { useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err, Crud } from "../components/UI";

export function AIStudio() {
  const { data: st } = useFetch<any>("/api/ai/status");
  const [task, setTask] = useState("caption");
  const [brief, setBrief] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const tasks = st?.tasks || ["caption", "campaign_plan", "content_ideas", "hashtags", "press_draft"];
  return (
    <div>
      <h2>AI Studio</h2>
      <div className="glass">
        <div className="muted">Provider: <b>{st?.provider || "…"}</b> · Model: <b>{st?.model || "…"}</b> · {st?.configured ? "key configured" : "⚠ AI API key not set — configure backend .env"}</div>
        <div className="muted">Drafts only. Human approval required before publishing, spending, or contracting.</div>
        <div className="row mt">
          <select value={task} onChange={(e) => setTask(e.target.value)} style={{ maxWidth: 220 }}>
            {tasks.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Brief — e.g. committee reveal for UNSC…" value={brief} onChange={(e) => setBrief(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" disabled={busy || !brief} onClick={async () => {
            setBusy(true); setOut("");
            try { const r = await api.post("/api/ai/generate", { task, brief }); setOut(r.text); toast(`Draft ready (${r.latency_ms}ms)`); }
            catch (e) { toast(String(e)); }
            finally { setBusy(false); }
          }}>{busy ? "Generating…" : "Generate draft"}</button>
        </div>
        {out && <div className="glass mt" style={{ whiteSpace: "pre-wrap" }}>{out}<div className="muted mt">↑ AI draft — edit before use. Never auto-publishes.</div></div>}
      </div>
    </div>
  );
}

export function ApprovalsPage() {
  return <Crud title="Approval & decision hub" path="approvals" fields={["type", "title", "requested_by", "reviewer", "deadline", "status", "decision"]} hint="Consequential decisions require explicit human approve/reject here." />;
}

export function Activity() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/activity");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  return <div><h2>Activity & audit log</h2><div className="glass">{(data || []).map((e) => <div key={e.id} className="mt" style={{ fontSize: 14 }}>• <b>{e.actor}</b> {e.action} <span className="muted">{e.entity}</span> — {e.message} <span className="muted">({e.at})</span></div>)}</div></div>;
}

export function Notifications() {
  const { data, loading, err, reload } = useFetch<{ items: any[]; due_now: any[]; unread: number }>("/api/notifications");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const body = data || { items: [], due_now: [], unread: 0 };
  return (
    <div><h2>Notifications {body.unread > 0 && <span className="pill">{body.unread} unread</span>}</h2>
      {body.due_now.length > 0 && (
        <div className="glass" style={{ borderLeft: "3px solid #ff3366" }}>
          <b>⏰ Deadlines</b>
          {body.due_now.map((d) => (
            <div key={d.task_id} className="mt" style={{ fontSize: 14 }}>
              <span className={`pill ${d.tag === "overdue" ? "critical" : "high"}`}>{d.tag === "overdue" ? "overdue" : "due soon"}</span>
              {" "}{d.title} — <span className="muted">{d.due_date}</span>
            </div>
          ))}
        </div>
      )}
      <div className="glass mt">
        {!(body.items || []).length && <div className="muted">No notifications.</div>}
        {(body.items || []).map((n) => (
          <div key={n.id} className="row mt" style={{ justifyContent: "space-between" }}>
            <span style={{ opacity: n.read ? 0.6 : 1 }}>{n.read ? "✓" : "●"} {n.message}</span>
            {!n.read && <button className="btn ghost" onClick={async () => { await api.post(`/api/notifications/${n.id}/read`, {}); reload(); }}>Mark read</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const { data: st } = useFetch<any>("/api/ai/status");
  return (
    <div><h2>Settings & AI configuration</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="glass"><h3>AI provider (server-side only)</h3>
          <div className="muted">Provider: {st?.provider} · Base: {st?.base_url}</div><div className="muted">Model: {st?.model}</div>
          <div className="muted">Registry: {(st?.registry ? Object.keys(st.registry) : []).join(", ")}</div>
          <div className="muted mt">Set the provider key in backend/.env (AI_PROVIDER=gemini|nvidia). Keys never touch the browser.</div>
        </div>
        <div className="glass"><h3>Social integrations</h3><div className="muted">Accounts show <b>Not Connected</b> until real OAuth/API keys are added. Metrics are never fabricated.</div></div>
        <div className="glass"><h3>Seed data</h3><div className="muted">All [DEMO] rows are fictional. Wipe: <code>python -m app.seed --wipe</code> in backend/.</div></div>
      </div>
    </div>
  );
}
