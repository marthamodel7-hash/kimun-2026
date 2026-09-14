import { useEffect, useState } from "react";
import { api, toast } from "../api";
import { useAuth } from "../auth";
import { useFetch, Loading, Err, Empty } from "../components/UI";

const STATUSES = ["backlog", "todo", "in_progress", "blocked", "review", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "critical"];

export function Tasks() {
  const { user } = useAuth();
  const canAssign = !!(user && ["super_admin", "secretary_general", "deputy_sg", "director_general", "dept_head"].includes(user.role));
  const { data, loading, err, reload } = useFetch<any[]>("/api/tasks");
  const [title, setTitle] = useState("");
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<any | null>(null);
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  let rows = data || [];
  if (filter === "mine") rows = rows.filter((t) => t.owner_id === user?.id);
  if (filter === "today") rows = rows.filter((t) => t.due_date === today && t.status !== "completed");
  if (filter === "week") rows = rows.filter((t) => t.due_date && t.due_date <= weekEnd && t.status !== "completed");
  if (filter === "overdue") rows = rows.filter((t) => t.due_date && t.due_date < today && !["completed", "cancelled"].includes(t.status));
  const openTask = (t: any) => setSel(rows.find((r) => r.id === t.id) || t);
  return (
    <div>
      <h2>Tasks</h2>
      <div className="tabs">{["list", "kanban", "calendar"].map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v}</button>)}</div>
      <div className="tabs">{[["all", "All"], ["mine", "My tasks"], ["today", "Today"], ["week", "This week"], ["overdue", "Overdue"]].map(([v, l]) => <button key={v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l} ({rows.length})</button>)}</div>
      <div className="glass">
        <div className="row">
          {canAssign && <input placeholder="New task title…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: 320 }} />}
          {canAssign && <button className="btn" onClick={async () => { if (!title) return; await api.post("/api/tasks", { title, status: "todo", priority: "medium" }); setTitle(""); reload(); toast("Task created"); }}>+ Add task</button>}
          {!canAssign && <div className="muted">Your assigned tasks are below. Ask an Executive Body or Dept Head to assign new work.</div>}
        </div>
      </div>
      {!rows.length ? <div className="mt"><Empty t={canAssign ? "create the first task" : "no tasks assigned to you yet"} /></div> : view === "kanban" ? (
        <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          {STATUSES.map((s) => (
            <div className="glass" key={s}><b>{s}</b>
              {rows.filter((t) => t.status === s).map((t) => (
                <div key={t.id} className="glass mt" style={{ padding: 10, cursor: "pointer" }} onClick={() => openTask(t)}>
                  <div>{t.title}</div>
                  {t.owner_name && <div className="muted" style={{ fontSize: 12 }}>→ {t.owner_name}</div>}
                  <div className="row mt"><span className={`pill ${t.priority}`}>{t.priority}</span>
                    <select value={t.status} onClick={(e) => e.stopPropagation()} onChange={async (e) => { await api.put(`/api/tasks/${t.id}`, { status: e.target.value }); reload(); }}>
                      {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : view === "calendar" ? (
        <TaskCalendar rows={rows} onOpen={openTask} />
      ) : (
        <div className="glass mt"><table><thead><tr><th>Title</th><th>Assigned</th><th>Status</th><th>Priority</th><th>Due</th><th /></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td><a href="#" onClick={(e) => { e.preventDefault(); openTask(t); }}>{t.title}</a></td>
              <td className="muted">{t.owner_name || "—"}</td>
              <td><select value={t.status} onChange={async (e) => { await api.put(`/api/tasks/${t.id}`, { status: e.target.value }); reload(); }}>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
              <td><span className={`pill ${t.priority}`}>{t.priority}</span></td><td>{t.due_date || "—"}</td>
              {canAssign && <td><button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/tasks/${t.id}`); reload(); } }}>✕</button></td>}
            </tr>
          ))}</tbody></table></div>
      )}
      {sel && <TaskDrawer task={sel} canAssign={canAssign} onClose={() => setSel(null)} onChanged={async () => { reload(); const fresh = await api.get("/api/tasks"); const f = fresh.find((r: any) => r.id === sel.id); if (f) setSel(f); }} />}
    </div>
  );
}

function TaskDrawer({ task, canAssign, onClose, onChanged }: { task: any; canAssign: boolean; onClose: () => void; onChanged: () => void }) {
  const [draft, setDraft] = useState({ description: task.description || "", priority: task.priority || "medium", project: task.project || "", due_date: task.due_date || "", tags: task.tags || "", recurrence: task.recurrence || "", owner_id: task.owner_id || "" });
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState("");
  useEffect(() => {
    api.get(`/api/tasks/${task.id}/comments`).then(setComments).catch(() => setComments([]));
    if (canAssign) api.get("/api/users").then(setUsers).catch(() => setUsers([]));
  }, [task.id, canAssign]);
  const save = async () => {
    const clean: Record<string, unknown> = { ...draft };
    if (clean.owner_id === "") delete clean.owner_id;
    const r = await api.put(`/api/tasks/${task.id}`, clean);
    toast(r.spawned_id ? `Task updated — next occurrence #${r.spawned_id} created` : "Task updated");
    onChanged();
  };
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px,100%)", zIndex: 70, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(30px)", borderLeft: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b style={{ fontSize: 17 }}>{task.title}</b>
        <button className="btn ghost" onClick={onClose}>✕ Close</button>
      </div>
      <div className="muted mt">Status: <span className="pill">{task.status}</span> · assigned to {task.owner_name || "unassigned"}</div>
      <div className="mt"><label className="muted">Description</label><textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className="grid mt" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><label className="muted">Priority</label><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label className="muted">Due date</label><input type="date" value={draft.due_date || ""} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} /></div>
        {canAssign && <div><label className="muted">Project</label><input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} /></div>}
        {canAssign && <div><label className="muted">Tags</label><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></div>}
        {canAssign && <div><label className="muted">Repeats</label><select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}>
          <option value="">never</option><option value="weekly">weekly</option><option value="monthly">monthly</option>
        </select></div>}
        {canAssign && <div><label className="muted">Owner</label><select value={draft.owner_id || ""} onChange={(e) => setDraft({ ...draft, owner_id: e.target.value ? Number(e.target.value) : "" })}>
          <option value="">unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select></div>}
      </div>
      <button className="btn mt" onClick={save}>Save changes</button>
      <h3 className="mt">Comments ({comments.length})</h3>
      {!comments.length && <div className="muted">No comments yet.</div>}
      {comments.map((c) => <div key={c.id} className="glass mt" style={{ padding: 10, fontSize: 14 }}>{c.body}<div className="muted" style={{ fontSize: 12 }}>{c.created_at}</div></div>)}
      <div className="row mt">
        <input placeholder="Write a comment…" value={body} onChange={(e) => setBody(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" onClick={async () => {
          if (!body.trim()) return;
          await api.post(`/api/tasks/${task.id}/comments`, { body });
          setBody("");
          setComments(await api.get(`/api/tasks/${task.id}/comments`));
          toast("Comment added");
        }}>Post</button>
      </div>
    </div>
  );
}

function TaskCalendar({ rows, onOpen }: { rows: any[]; onOpen: (t: any) => void }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const byDay: Record<string, any[]> = {};
  rows.forEach((t) => {
    if (!t.due_date) return;
    const d = new Date(t.due_date + "T00:00:00");
    if (d.getFullYear() === ym.y && d.getMonth() === ym.m) {
      const k = t.due_date;
      (byDay[k] = byDay[k] || []).push(t);
    }
  });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="glass mt">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost" onClick={() => setYm({ y: ym.m === 0 ? ym.y - 1 : ym.y, m: (ym.m + 11) % 12 })}>← Prev</button>
        <b>{first.toLocaleString("default", { month: "long", year: "numeric" })}</b>
        <button className="btn ghost" onClick={() => setYm({ y: ym.m === 11 ? ym.y + 1 : ym.y, m: (ym.m + 1) % 12 })}>Next →</button>
      </div>
      <div className="grid mt" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="muted" style={{ textAlign: "center", fontSize: 12 }}>{d}</div>)}
        {Array.from({ length: startPad }).map((_, i) => <div key={"p" + i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const ds = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const items = byDay[ds] || [];
          return (
            <div key={ds} style={{ minHeight: 64, border: ds === today ? "1px solid var(--gold)" : "1px solid var(--border)", borderRadius: 10, padding: 4, fontSize: 12 }}>
              <div className="muted">{i + 1}</div>
              {items.slice(0, 3).map((t) => (
                <div key={t.id} onClick={() => onOpen(t)} style={{ cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: t.status === "completed" ? "var(--success)" : t.priority === "critical" ? "#ff6b8a" : "var(--text)" }} title={t.title}>
                  • {t.title}
                </div>
              ))}
              {items.length > 3 && <div className="muted">+{items.length - 3} more</div>}
            </div>
          );
        })}
      </div>
      <div className="muted mt" style={{ fontSize: 12 }}>Unscheduled tasks (no due date) appear in list/kanban only.</div>
    </div>
  );
}
