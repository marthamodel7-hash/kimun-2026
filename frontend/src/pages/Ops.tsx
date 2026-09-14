import { useState } from "react";
import { api, toast } from "../api";
import { useAuth } from "../auth";
import { useFetch, Loading, Err, UploadButton } from "../components/UI";
import { Crud } from "../components/UI";

const PIPELINE = ["lead", "contacted", "proposal_sent", "meeting", "negotiation", "confirmed", "contracted", "paid", "completed"];

export function Sponsors() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/sponsors");
  const [org, setOrg] = useState("");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const rows = data || [];
  const total = rows.reduce((a, s) => a + (s.value || 0), 0);
  const got = rows.reduce((a, s) => a + (s.amount_received || 0), 0);
  return (
    <div>
      <h2>Sponsors — pipeline & deliverables</h2>
      <div className="grid kpis"><div className="glass kpi"><div className="l">Committed</div><div className="v">Rs. {total.toLocaleString()}</div></div>
        <div className="glass kpi"><div className="l">Received</div><div className="v">Rs. {got.toLocaleString()}</div></div>
        <div className="glass kpi"><div className="l">Outstanding</div><div className="v">Rs. {(total - got).toLocaleString()}</div></div></div>
      <div className="glass mt row"><input placeholder="New sponsor organization…" value={org} onChange={(e) => setOrg(e.target.value)} style={{ maxWidth: 300 }} />
        <button className="btn" onClick={async () => { if (!org) return; await api.post("/api/sponsors", { organization: org, pipeline_status: "lead" }); setOrg(""); reload(); toast("Sponsor added"); }}>+ Add</button>
        <span style={{ flex: 1 }} />
        <button className="btn ghost" onClick={async () => { try { await api.download("/api/exports/sponsors.xlsx", "kimun-sponsors.xlsx"); toast("Excel exported"); } catch (e) { toast(String(e)); } }}>⬇ Export Excel</button></div>
      <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {PIPELINE.map((s) => (
          <div className="glass" key={s}><b style={{ fontSize: 13 }}>{s}</b>
            {rows.filter((x) => x.pipeline_status === s).map((x) => <SponsorCard key={x.id} s={x} reload={reload} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SponsorCard({ s, reload }: { s: any; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const delivsQ = useFetch<any[]>("/api/deliverables");
  const delivs = delivsQ.data;
  const mine = (delivs || []).filter((d) => d.sponsor_id === s.id);
  const done = mine.filter((d) => d.status === "done").length;
  return (
    <div className="glass mt" style={{ padding: 10 }}>
      <b>{s.organization}</b>
      <div className="muted">{s.package} · Rs. {Number(s.value || 0).toLocaleString()} · <span className="pill">{s.payment_status}</span></div>
      <div className="bar mt"><div style={{ width: (mine.length ? Math.round((done / mine.length) * 100) : 0) + "%" }} /></div>
      <div className="muted" style={{ fontSize: 12 }}>{done}/{mine.length} deliverables</div>
      <div className="row mt">
        <select value={s.pipeline_status} onChange={async (e) => { await api.put(`/api/sponsors/${s.id}`, { pipeline_status: e.target.value }); reload(); }}>
          {PIPELINE.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <button className="btn ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "Deliverables"}</button>
      </div>
      {open && <div className="mt">{mine.map((d) => (
        <div key={d.id} className="row" style={{ justifyContent: "space-between", margin: "6px 0" }}>
          <span style={{ fontSize: 13 }}>{d.status === "done" ? "✅" : "⬜"} {d.description}{d.proof_url ? <> <a href={d.proof_url} target="_blank" rel="noreferrer">proof</a></> : null}</span>
          {d.status !== "done" && <UploadButton label="Upload proof + complete" onUrl={async (url) => { await api.put(`/api/deliverables/${d.id}`, { status: "done", proof_url: url }); reload(); delivsQ.reload(); toast("Deliverable completed with proof"); }} />}
        </div>
      ))}
        <AddDeliverable sponsorId={s.id} onAdded={() => { reload(); delivsQ.reload(); }} /></div>}
    </div>
  );
}

function AddDeliverable({ sponsorId, onAdded }: { sponsorId: number; onAdded: () => void }) {
  const [d, setD] = useState("");
  return <div className="row mt"><input placeholder="New deliverable…" value={d} onChange={(e) => setD(e.target.value)} />
    <button className="btn" onClick={async () => { if (!d) return; await api.post("/api/deliverables", { sponsor_id: sponsorId, description: d }); setD(""); onAdded(); }}>+ Add</button></div>;
}

export function Finance() {
  const { data, reload } = useFetch<any[]>("/api/transactions");
  const rows = data || [];
  const rev = rows.filter((t) => t.kind === "revenue" && t.status !== "cancelled").reduce((a, t) => a + (t.amount || 0), 0);
  const exp = rows.filter((t) => t.kind === "expense" && t.status !== "cancelled").reduce((a, t) => a + (t.amount || 0), 0);
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Finance — revenue & expenses</h2>
        <button className="btn ghost" onClick={async () => { try { await api.download("/api/exports/finance.xlsx", "kimun-finance.xlsx"); toast("Excel exported"); } catch (e) { toast(String(e)); } }}>⬇ Export Excel</button>
      </div>
      <div className="grid kpis mt">
        <div className="glass kpi"><div className="l">Revenue</div><div className="v">Rs. {rev.toLocaleString()}</div></div>
        <div className="glass kpi"><div className="l">Expenses</div><div className="v">Rs. {exp.toLocaleString()}</div></div>
        <div className="glass kpi"><div className="l">Net</div><div className="v">Rs. {(rev - exp).toLocaleString()}</div></div>
      </div>
      <div className="mt"><Crud title="Transactions" path="transactions" fields={["kind", "category", "description", "amount", "projected", "status", "approved_by", "date"]} hint="Finance is RBAC-restricted. Approvals stay pending until a reviewer decides — never auto-approved." /></div>
    </div>
  );
}
export function Committees() {
  const [sel, setSel] = useState<number | null>(null);
  const committeesQ = useFetch<any[]>("/api/committees");
  const sessionsQ = useFetch<any[]>("/api/committee_sessions");
  const committees = committeesQ.data || [];
  const sessions = sessionsQ.data || [];
  const mine = sessions.filter((s) => s.committee_id === sel);
  return (
    <div>
      <h2>Committees & sessions</h2>
      <div className="row mt" style={{ gap: 8, flexWrap: "wrap" }}>
        {committees.map((c) => (
          <button key={c.id} className={`btn ${sel === c.id ? "" : "ghost"}`} onClick={() => setSel(c.id === sel ? null : c.id)}>
            {c.name} <span className="muted">({sessions.filter((s) => s.committee_id === c.id).length})</span>
          </button>
        ))}
      </div>
      {sel != null && <AddSession cid={sel} onAdded={() => sessionsQ.reload()} />}
      {mine.length ? <div className="mt">{mine.map((s) => <SessionCard key={s.id} s={s} onChanged={() => sessionsQ.reload()} />)}</div> :
        <div className="glass mt muted">Pick a committee above to see/add its sessions.</div>}
      <div className="mt"><Crud title="Committees" path="committees" fields={["name", "type", "agenda", "chair", "co_chair", "room", "allocation_done"]} /></div>
    </div>
  );
}

function AddSession({ cid, onAdded }: { cid: number; onAdded: () => void }) {
  const [f, setF] = useState({ title: "Session", session_date: "2026-12-18", start_time: "10:00", end_time: "13:00", room: "", chair: "", status: "scheduled", agenda: "" });
  return (
    <div className="glass mt">
      <div className="row">
        <input placeholder="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={{ maxWidth: 180 }} />
        <input type="date" value={f.session_date} onChange={(e) => setF({ ...f, session_date: e.target.value })} style={{ width: 150 }} />
        <input value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} style={{ width: 80 }} />
        <input value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} style={{ width: 80 }} />
        <input placeholder="room" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} style={{ maxWidth: 110 }} />
        <input placeholder="chair" value={f.chair} onChange={(e) => setF({ ...f, chair: e.target.value })} style={{ maxWidth: 140 }} />
        <button className="btn" onClick={async () => { await api.post("/api/committee_sessions", { ...f, committee_id: cid }); onAdded(); toast("Session scheduled"); }}>+ Schedule</button>
      </div>
      <input className="mt" placeholder="agenda for this session…" value={f.agenda} onChange={(e) => setF({ ...f, agenda: e.target.value })} style={{ width: "100%" }} />
    </div>
  );
}

function SessionCard({ s, onChanged }: { s: any; onChanged: () => void }) {
  const [minutes, setMinutes] = useState(s.minutes || "");
  const [editing, setEditing] = useState(false);
  return (
    <div className="glass mt">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b>{s.title || "Session"}</b>
        <span className="pill">{s.status}</span>
      </div>
      <div className="muted" style={{ fontSize: 13 }}>{s.session_date} · {s.start_time}–{s.end_time} · {s.room || "TBD"} · chair: {s.chair || "TBD"}</div>
      {s.agenda && <div className="mt muted" style={{ fontSize: 13 }}>📋 {s.agenda}</div>}
      <div className="row mt">
        <button className="btn ghost" onClick={() => setEditing(!editing)}>{editing ? "Close minutes" : (s.minutes ? "Edit minutes" : "Write minutes")}</button>
        {s.minutes && !editing && <button className="btn" onClick={async () => { await api.put(`/api/committee_sessions/${s.id}`, { status: "finalized" }); onChanged(); toast("Minutes finalized"); }}>Finalize</button>}
        <button className="btn ghost" onClick={async () => { if (confirm("Delete session?")) { await api.del(`/api/committee_sessions/${s.id}`); onChanged(); } }}>✕</button>
      </div>
      {editing && (
        <div className="mt">
          <textarea rows={6} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes draft — attendees, resolutions, motions, notes…" style={{ width: "100%" }} />
          <button className="btn mt" onClick={async () => {
            const m = minutes.trim();
            await api.put(`/api/committee_sessions/${s.id}`, { minutes: m, status: m ? "minutes_draft" : "scheduled" });
            setEditing(false); onChanged(); toast(m ? "Minutes saved (draft)" : "Minutes cleared");
          }}>Save minutes</button>
        </div>
      )}
      {s.minutes && !editing && <pre className="muted mt" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{s.minutes}</pre>}
    </div>
  );
}
export function Venue() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
      <div><Crud title="Venue readiness checklist" path="venue" fields={["area", "item", "status", "owner", "notes"]} /></div>
      <div><Crud title="Rooms" path="rooms" fields={["name", "capacity", "assignment"]} /></div>
    </div>
  );
}
export function Procurement() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
      <div><Crud title="Procurement (Requested → Delivered)" path="procurement" fields={["item", "quantity", "quote", "final_cost", "status", "delivery_date"]} /></div>
      <div><Crud title="Vendors" path="vendors" fields={["name", "contact", "notes"]} /></div>
    </div>
  );
}
export function Team() {
  const { user } = useAuth();
  const usersQ = useFetch<any[]>("/api/users");
  const tasksQ = useFetch<any[]>("/api/tasks");
  const users = usersQ.data || [];
  const open = (tasksQ.data || []).filter((t) => !["completed", "cancelled"].includes(t.status));
  const max = Math.max(1, ...users.map((u) => open.filter((t) => t.owner_id === u.id).length));
  const canAssign = !!(user && ["super_admin", "secretary_general", "deputy_sg", "director_general", "dept_head"].includes(user.role));
  const tiers = [
    { key: "executive", label: "Executive Body", color: "#ffaa00" },
    { key: "general", label: "General Body", color: "#00d4ff" },
    { key: "organizing", label: "Organizing Members", color: "#00f5d4" },
  ];
  const byTier: Record<string, any[]> = {};
  users.forEach((u) => { const t = u.tier || "general"; (byTier[t] = byTier[t] || []).push(u); });
  return (
    <div>
      <h2>Team & workload</h2>
      {tiers.map(({ key, label, color }) => {
        const members = byTier[key] || [];
        if (!members.length) return null;
        return (
          <div key={key} className="glass mt">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b style={{ color }}>{label}</b>
              <span className="muted">{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>
            {members.map((u) => {
              const n = open.filter((t) => t.owner_id === u.id).length;
              const pct = max > 0 ? Math.round((n / max) * 100) : 0;
              const hot = n >= 8;
              return (
                <div key={u.id} className="row" style={{ margin: "8px 0", gap: 10, alignItems: "center" }}>
                  <span style={{ width: 200 }}>
                    <b>{u.name}</b>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {u.reference_number ? <span style={{ fontFamily: "monospace", letterSpacing: 0.5, color: "#c4a55a" }}>{u.reference_number}</span> : null}
                      {u.department_name ? <span> · {u.department_name}</span> : <span> · {u.role_label || u.role}</span>}
                    </div>
                  </span>
                  <div className="bar" style={{ flex: 1 }}><div style={{ width: `${pct}%`, background: hot ? "linear-gradient(90deg,#ff3366,#ffaa00)" : undefined }} /></div>
                  <b style={{ width: 60, textAlign: "right" }}>{n} {hot ? "🔥" : ""}</b>
                  {canAssign && <QuickAssign userId={u.id} userName={u.name} onAssigned={() => tasksQ.reload()} />}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="muted mt" style={{ fontSize: 12 }}>Unassigned open tasks: {open.filter((t) => !t.owner_id).length} — assign from tasks or use the + button.</div>
      <div className="mt"><ShiftPlanner users={users} /></div>
      <div className="mt"><Crud title="Members" path="users" fields={["name", "email", "role", "phone"]} hint="User creation is admin-only; volunteers see only assigned work." /></div>
    </div>
  );
}

function QuickAssign({ userId, userName, onAssigned }: { userId: number; userName: string; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
  const submit = async () => {
    if (!title.trim()) return;
    await api.post("/api/tasks", { title: title.trim(), owner_id: userId, due_date: due || null, priority });
    setTitle(""); setDue(""); setOpen(false); onAssigned(); toast(`Assigned to ${userName}`);
  };
  if (!open) return <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setOpen(true)}>+ Assign</button>;
  return (
    <span className="row" style={{ gap: 4, background: "var(--surface2)", padding: "4px 8px", borderRadius: 8 }}>
      <input placeholder="task title" value={title} onChange={(e) => setTitle(e.target.value)}
             onKeyDown={(e) => e.key === "Enter" && submit()} style={{ width: 140, fontSize: 12 }} autoFocus />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 120, fontSize: 12 }} />
      <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 80, fontSize: 12 }}>
        <option value="low">low</option><option value="medium">med</option><option value="high">high</option><option value="critical">crit</option>
      </select>
      <button className="btn" style={{ fontSize: 12 }} onClick={submit}>→</button>
      <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setOpen(false)}>✕</button>
    </span>
  );
}

function ShiftPlanner({ users }: { users: any[] }) {
  const { data, loading, err, reload } = useFetch<any[]>("/api/shifts");
  const CONF = "2026-12-18";
  const [weekOff, setWeekOff] = useState(0); // 0 = this week, offsets navigate
  const base = new Date();
  base.setDate(base.getDate() + weekOff * 7);
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const byUser = (users || []).map((u) => ({ u, shifts: (data || []).filter((s) => s.user_id === u.id) }));
  const [f, setF] = useState({ user_id: "", shift_date: "", start_time: "09:00", end_time: "13:00", zone: "Registration", role: "", status: "assigned" });
  return (
    <div className="glass">
      <h3 style={{ marginTop: 0 }}>Shift planner — this week</h3>
      <div className="row mt">
        <button className="btn ghost" onClick={() => setWeekOff(weekOff - 1)}>← Prev</button>
        <b style={{ fontSize: 13 }}>{DAYS[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – {DAYS[6].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</b>
        <button className="btn ghost" onClick={() => setWeekOff(weekOff + 1)}>Next →</button>
        <button className="btn ghost" onClick={() => setWeekOff(Math.round((new Date(CONF).getTime() - new Date().getTime()) / 604800000))}>Jump to conference week</button>
      </div>
      <div className="row mt">
        <select value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} style={{ maxWidth: 200 }}>
          <option value="">assign to…</option>{(users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" value={f.shift_date} onChange={(e) => setF({ ...f, shift_date: e.target.value })} />
        <input value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} style={{ width: 80 }} />
        <input value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} style={{ width: 80 }} />
        <input placeholder="zone" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} style={{ width: 130 }} />
        <input placeholder="role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={{ width: 120 }} />
        <button className="btn" disabled={!f.user_id || !f.shift_date} onClick={async () => {
          await api.post("/api/shifts", f); reload(); toast("Shift assigned");
        }}>+ Assign shift</button>
      </div>
      {loading ? <div className="muted mt">Loading…</div> : (
        <table className="mt"><thead><tr><th>Member</th>{DAYS.map((d) => <th key={d.toISOString().slice(0, 10)}>{d.toLocaleDateString("en", { weekday: "short", month: "numeric", day: "numeric" })}</th>)}<th /></tr></thead>
          <tbody>{byUser.map(({ u, shifts }) => (
            <tr key={u.id}>
              <td><b>{u.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>{u.role}</span></td>
              {DAYS.map((d) => {
                const key = d.toISOString().slice(0, 10);
                const mine = shifts.filter((s) => s.shift_date === key);
                return (
                  <td key={key} style={{ padding: 6, minWidth: 110 }}>
                    {mine.map((s) => (
                      <div key={s.id} className="pill" style={{ fontSize: 11, margin: "2px 0", cursor: "pointer", background: s.status === "cancelled" ? "var(--danger)" : undefined }}
                        title={`${s.start_time}-${s.end_time} ${s.zone} · ${s.status}`}
                        onClick={async () => {
                          const next = s.status === "confirmed" ? "cancelled" : "confirmed";
                          await api.put(`/api/shifts/${s.id}`, { status: next }); reload();
                        }}>
                        {s.start_time}-{s.end_time} {s.zone}
                      </div>
                    ))}
                  </td>
                );
              })}
              <td style={{ fontSize: 12 }}>{shifts.length} shifts</td>
            </tr>
          ))}</tbody></table>
      )}
      <div className="muted mt" style={{ fontSize: 12 }}>Click a shift to toggle confirmed/cancelled. Conference days: 2026-12-18 → 2026-12-20.</div>
    </div>
  );
}
export function Documents() {
  return <Crud title="Document Vault" path="documents" fields={["title", "category", "path", "version"]} />;
}
export function Risks() {
  return <Crud title="Risk register" path="risks" fields={["title", "probability", "impact", "severity", "owner", "status"]} />;
}
export function Control() {
  return <Crud title="Event-day incidents" path="incidents" fields={["title", "severity", "location", "reported_by", "assigned_to", "status"]} />;
}
