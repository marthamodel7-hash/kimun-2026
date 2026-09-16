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
  const [wiping, setWiping] = useState(false);
  const [wipingAll, setWipingAll] = useState(false);
  return (
    <div><h2>Settings & Data Management</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="glass"><h3>AI provider (server-side only)</h3>
          <div className="muted">Provider: {st?.provider} · Base: {st?.base_url}</div><div className="muted">Model: {st?.model}</div>
          <div className="muted">Registry: {(st?.registry ? Object.keys(st.registry) : []).join(", ")}</div>
          <div className="muted mt">Set the provider key in backend/.env (AI_PROVIDER=gemini|nvidia). Keys never touch the browser.</div>
        </div>
        <div className="glass"><h3>Social integrations</h3><div className="muted">Accounts show <b>Not Connected</b> until real OAuth/API keys are added. Metrics are never fabricated.</div></div>
      </div>

      {/* ── Wipe Demo Data ── */}
      <div className="glass mt" style={{ borderLeft: "3px solid #ff3366" }}>
        <h3 style={{ color: "#ff3366", marginTop: 0 }}>Danger Zone</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Wipe Demo Data</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Removes all <code>[DEMO]</code> tagged rows (delegates, tasks, sponsors, etc). Your real data stays intact.</div>
            <button className="btn" disabled={wiping} style={{ background: "rgba(255,51,102,0.15)", borderColor: "rgba(255,51,102,0.4)" }}
              onClick={async () => {
                if (!confirm("Delete ALL demo data? Real data will NOT be affected.")) return;
                setWiping(true);
                try { const r = await api.post("/api/admin/wipe-demo", {}); toast(`Wiped ${r.deleted} demo records`); }
                catch (e) { toast(String(e)); }
                finally { setWiping(false); }
              }}>{wiping ? "Wiping…" : "🗑 Wipe Demo Data"}</button>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Wipe EVERYTHING</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Nuclear option — deletes all data, all users, all records. Only use if starting completely fresh.</div>
            <button className="btn" disabled={wipingAll} style={{ background: "rgba(255,51,102,0.25)", borderColor: "rgba(255,51,102,0.6)" }}
              onClick={async () => {
                if (!confirm("⚠️ DELETE EVERYTHING? This cannot be undone.")) return;
                if (!confirm("Are you REALLY sure? All delegates, tasks, sponsors, everything will be gone.")) return;
                setWipingAll(true);
                try { await api.post("/api/admin/wipe-all", {}); toast("All data wiped"); localStorage.removeItem("kimun_token"); window.location.href = "/login"; }
                catch (e) { toast(String(e)); }
                finally { setWipingAll(false); }
              }}>{wipingAll ? "Deleting…" : "💀 Wipe EVERYTHING"}</button>
          </div>
        </div>
      </div>

      {/* ── Adding Real Data ── */}
      <div className="glass mt" style={{ borderLeft: "3px solid #00ff88" }}>
        <h3 style={{ color: "#00ff88", marginTop: 0 }}>Adding Real Data</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, fontSize: 14 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 Delegates</div>
            <div className="muted">Go to <b>Delegates</b> → use the <b>Import CSV</b> button. Or click <b>+ Add</b> to add one at a time. Columns: name, institution, email, country, phone.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🏛️ Committees</div>
            <div className="muted">Go to <b>Committees</b> → <b>+ Add</b>. Enter name, type, chair, room. Then assign countries via <b>Allocation</b>.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🏢 Groups / Delegations</div>
            <div className="muted">Go to <b>Delegations</b> → <b>+ Add</b>. Enter group name, contact info. Then add delegates to the group.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>💰 Sponsors</div>
            <div className="muted">Go to <b>Sponsors</b> → <b>+ Add</b>. Track packages, payments, and deliverables.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 Tasks</div>
            <div className="muted">Go to <b>Tasks</b> → <b>+ Add</b>. Assign to departments, set priorities, due dates, and recurrence.</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>👥 Team Members</div>
            <div className="muted">Go to <b>Settings</b> → use the API to create users with roles. Each gets a portal login.</div>
          </div>
        </div>
        <div className="muted mt" style={{ fontSize: 13 }}>
          <b>CSV Import tip:</b> Export a blank CSV from any section to see the column headers, fill in your data, then re-import.
        </div>
      </div>
    </div>
  );
}
