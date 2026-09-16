import { useState, useEffect } from "react";
import { api, toast } from "../api";

type Application = {
  id: number; name: string; phone: string; email: string; city: string;
  photo_url: string; experience: string; department_preference: string;
  status: string; interview_date: string | null; interview_notes: string;
  reference_number: string; department_id: number | null; department_name: string;
  admin_notes: string; created_at: string;
};
type Dept = { id: number; name: string };

const STATUS_COLORS: Record<string, string> = {
  applied: "#c4a55a", interview_scheduled: "#ffaa00", interviewed: "#c4a55a",
  approved: "#00ff88", rejected: "#ff3366",
};
const STATUSES = ["", "applied", "interview_scheduled", "interviewed", "approved", "rejected"];

export function ApplicationsPanel() {
  const [apps, setApps] = useState<Application[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [intvDate, setIntvDate] = useState("");
  const [intvNotes, setIntvNotes] = useState("");
  const [assignDept, setAssignDept] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (q) params.set("q", q);
    api.get(`/api/applications?${params}`).then(setApps).catch(() => {});
    api.get("/api/departments").then(setDepts).catch(() => {});
  }
  useEffect(load, [filter, q]);
  // auto-refresh every 15 seconds so new applications appear without manual re-open
  useEffect(() => {
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [filter, q]);

  function openDetail(a: Application) {
    setSelected(a);
    setIntvDate(a.interview_date ? a.interview_date.slice(0, 16) : "");
    setIntvNotes(a.interview_notes);
    setAssignDept(a.department_id || 0);
    setAdminNotes(a.admin_notes);
  }

  async function updateApp(status?: string) {
    if (!selected) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { admin_notes: adminNotes };
      if (status) body.status = status;
      if (intvDate) body.interview_date = new Date(intvDate).toISOString();
      if (intvNotes) body.interview_notes = intvNotes;
      if (assignDept) body.department_id = assignDept;
      const data = await api.put(`/api/applications/${selected.id}`, body);
      toast(status ? `Application → ${status}` : "Updated");
      setSelected(null);
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0, fontSize: 20 }}>Applications</h2>
        <div className="row">
          <input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} style={{ width: 180 }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid kpis" style={{ marginBottom: 16 }}>
        {["applied", "interview_scheduled", "interviewed", "approved", "rejected"].map(s => (
          <div key={s} className="glass kpi" style={{ cursor: "pointer" }} onClick={() => setFilter(filter === s ? "" : s)}>
            <div className="v" style={{ color: STATUS_COLORS[s], fontSize: 20 }}>{apps.filter(a => a.status === s).length}</div>
            <div className="l">{s.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      {/* Application list */}
      <div className="glass" style={{ overflowX: "auto" }}>
        <table>
          <thead><tr>
            <th>Name</th><th>Department</th><th>City</th><th>Status</th><th>Applied</th><th></th>
          </tr></thead>
          <tbody>
            {apps.map(a => (
              <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => openDetail(a)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {a.photo_url && <img src={a.photo_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7a90" }}>{a.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip chip-on">{a.department_preference}</span></td>
                <td>{a.city || "—"}</td>
                <td><span className="pill" style={{ borderColor: STATUS_COLORS[a.status], color: STATUS_COLORS[a.status] }}>{a.status.replace("_", " ")}</span></td>
                <td style={{ fontSize: 12, color: "#6b7a90" }}>{a.created_at?.slice(0, 10)}</td>
                <td><button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={e => { e.stopPropagation(); openDetail(a); }}>Review</button></td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#6b7a90", padding: 20 }}>No applications</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}
          onClick={() => setSelected(null)}>
          <div className="glass" style={{ width: "min(560px, 90vw)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setSelected(null)}>Close</button>
            </div>

            {/* Applicant info */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 12px", fontSize: 13, marginBottom: 16 }}>
              <span style={{ color: "#6b7a90" }}>Email</span><span>{selected.email}</span>
              <span style={{ color: "#6b7a90" }}>Phone</span><span>{selected.phone || "—"}</span>
              <span style={{ color: "#6b7a90" }}>City</span><span>{selected.city || "—"}</span>
              <span style={{ color: "#6b7a90" }}>Department</span><span className="chip chip-on">{selected.department_preference}</span>
              <span style={{ color: "#6b7a90" }}>Experience</span><span>{selected.experience || "—"}</span>
              <span style={{ color: "#6b7a90" }}>Status</span>
              <span><span className="pill" style={{ borderColor: STATUS_COLORS[selected.status], color: STATUS_COLORS[selected.status] }}>{selected.status.replace("_", " ")}</span></span>
              {selected.reference_number && <><span style={{ color: "#6b7a90" }}>Reference</span><span style={{ fontFamily: "monospace", color: "#c4a55a" }}>{selected.reference_number}</span></>}
            </div>

            {selected.photo_url && (
              <div style={{ marginBottom: 12 }}>
                <img src={selected.photo_url} alt="Applicant" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
              </div>
            )}

            {/* Admin actions */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.09)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7a90", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Admin Actions</div>

              {/* Schedule Interview */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 4 }}>Interview Date</div>
                <input type="datetime-local" value={intvDate} onChange={e => setIntvDate(e.target.value)} />
                <textarea placeholder="Interview notes..." value={intvNotes} onChange={e => setIntvNotes(e.target.value)}
                  style={{ minHeight: 40, marginTop: 4 }} />
                <button className="btn ghost" style={{ fontSize: 12, marginTop: 4 }} disabled={loading}
                  onClick={() => updateApp("interview_scheduled")}>Schedule Interview</button>
              </div>

              {/* Assign Department */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 4 }}>Assign Department (for approval)</div>
                <select value={assignDept} onChange={e => setAssignDept(Number(e.target.value))}>
                  <option value={0}>Select department...</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Admin Notes */}
              <div style={{ marginBottom: 10 }}>
                <textarea placeholder="Admin notes..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  style={{ minHeight: 50 }} />
              </div>

              {/* Approve / Reject */}
              <div className="row">
                <button className="btn" disabled={loading || !assignDept} onClick={() => updateApp("approved")}
                  style={{ background: "rgba(0,255,136,0.2)", borderColor: "rgba(0,255,136,0.5)" }}>Approve</button>
                <button className="btn" disabled={loading} onClick={() => updateApp("rejected")}
                  style={{ background: "rgba(255,51,102,0.2)", borderColor: "rgba(255,51,102,0.5)" }}>Reject</button>
                {selected.status === "interviewed" && (
                  <button className="btn ghost" disabled={loading} onClick={() => updateApp("interviewed")}>Mark Interviewed</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
