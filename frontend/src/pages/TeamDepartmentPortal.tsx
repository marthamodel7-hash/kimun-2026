/**
 * TeamDepartmentPortal — Dynamic department-specific portal.
 * Reads department_code from authenticated user, renders appropriate content.
 * Includes department-specific create/report forms.
 */
import { useState, useEffect, useCallback, useRef, FC } from "react";
import { useTeam, teamFetch, DEPT_META, useTeamRole } from "../teamPortal";

/* ── Palette ── */
const C = {
  bg: "#020305", text: "#e8f0f8", muted: "#8a8070", dim: "#5a5048",
  gold: "#c4a55a", goldLt: "#d4bc7a", goldDk: "#a08840",
};

/* ── Reusable components ── */
function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      padding: "18px 16px", borderRadius: 16,
      background: "rgba(196,165,90,0.02)", border: "1px solid rgba(196,165,90,0.06)",
    }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{
      padding: "48px 24px", textAlign: "center",
      background: "rgba(196,165,90,0.015)", border: "1px solid rgba(196,165,90,0.04)",
      borderRadius: 16,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, color: C.dim }}>{message}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    open: { bg: "rgba(196,165,90,0.06)", border: "rgba(196,165,90,0.15)", text: C.goldLt },
    in_progress: { bg: "rgba(107,128,112,0.08)", border: "rgba(107,128,112,0.2)", text: "#6b8070" },
    completed: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    resolved: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    pending: { bg: "rgba(196,165,90,0.06)", border: "rgba(196,165,90,0.15)", text: C.goldLt },
    active: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    inactive: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: C.dim },
    critical: { bg: "rgba(255,77,106,0.06)", border: "rgba(255,77,106,0.15)", text: "#ff4d6a" },
    high: { bg: "rgba(255,170,0,0.06)", border: "rgba(255,170,0,0.15)", text: "#ffaa00" },
    medium: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.gold },
    low: { bg: "rgba(107,128,112,0.06)", border: "rgba(107,128,112,0.15)", text: "#6b8070" },
    draft: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.dim },
    prospect: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.dim },
    contacted: { bg: "rgba(196,165,90,0.06)", border: "rgba(196,165,90,0.15)", text: C.goldLt },
    confirmed: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    ordered: { bg: "rgba(196,165,90,0.06)", border: "rgba(196,165,90,0.15)", text: C.goldLt },
    delivered: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    requested: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.dim },
    filming: { bg: "rgba(255,170,0,0.06)", border: "rgba(255,170,0,0.15)", text: "#ffaa00" },
    editing: { bg: "rgba(107,128,112,0.08)", border: "rgba(107,128,112,0.2)", text: "#6b8070" },
    done: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    published: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    sent: { bg: "rgba(107,128,112,0.08)", border: "rgba(107,128,112,0.2)", text: "#6b8070" },
    approved: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    rejected: { bg: "rgba(255,77,106,0.06)", border: "rgba(255,77,106,0.15)", text: "#ff4d6a" },
    uploaded: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.dim },
    archived: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: C.dim },
    general: { bg: "rgba(107,128,112,0.06)", border: "rgba(107,128,112,0.15)", text: "#6b8070" },
    restricted: { bg: "rgba(255,77,106,0.06)", border: "rgba(255,77,106,0.15)", text: "#ff4d6a" },
    vip: { bg: "rgba(196,165,90,0.06)", border: "rgba(196,165,90,0.15)", text: C.goldLt },
    staff_only: { bg: "rgba(107,128,112,0.08)", border: "rgba(107,128,112,0.2)", text: "#6b8070" },
    internal: { bg: "rgba(196,165,90,0.04)", border: "rgba(196,165,90,0.1)", text: C.gold },
    external: { bg: "rgba(107,128,112,0.06)", border: "rgba(107,128,112,0.15)", text: "#6b8070" },
    emergency: { bg: "rgba(255,77,106,0.06)", border: "rgba(255,77,106,0.15)", text: "#ff4d6a" },
    available: { bg: "rgba(0,255,136,0.05)", border: "rgba(0,255,136,0.12)", text: "#00ff88" },
    unavailable: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: C.dim },
  };
  const c = colors[status] || colors.open;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>{status}</span>
  );
}

/* ═══════════════════════════════════════════════
   FORM MODAL — reusable creation/reporting form
   ═══════════════════════════════════════════════ */
type FieldDef = { name: string; label: string; type?: "text" | "textarea" | "select"; placeholder?: string; options?: string[]; required?: boolean };

function FormModal({ title, fields, endpoint, onCreated, onClose }: {
  title: string; fields: FieldDef[]; endpoint: string;
  onCreated: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(f => [f.name, ""])));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const r = await teamFetch(endpoint, { method: "POST", body: JSON.stringify(form) });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: 13,
    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(196,165,90,0.1)",
    borderRadius: 10, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        padding: 16,
      }}>
      <style>{`.form-modal-input:focus { border-color: rgba(196,165,90,0.3) !important; box-shadow: 0 0 0 2px rgba(196,165,90,0.04) !important; }`}</style>
      <form onSubmit={handleSubmit} style={{
        width: "min(500px, 100%)", background: "rgba(8,12,22,0.92)",
        border: "1px solid rgba(196,165,90,0.1)", borderRadius: 20,
        backdropFilter: "blur(40px)", padding: "clamp(24px, 4vw, 36px)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Top chrome */}
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.2), transparent)" }} />

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: C.text }}>{title}</div>
          <button type="button" onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            color: C.dim, fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(196,165,90,0.12), rgba(196,165,90,0.04))", marginBottom: 20 }} />

        {fields.map(f => (
          <div key={f.name} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 6 }}>
              {f.label}{f.required !== false && " *"}
            </div>
            {f.type === "select" ? (
              <select
                className="form-modal-input"
                value={form[f.name]}
                onChange={e => set(f.name, e.target.value)}
                style={{ ...inputStyle, appearance: "none" as const, cursor: "pointer" }}
              >
                <option value="">Select...</option>
                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className="form-modal-input"
                placeholder={f.placeholder || ""}
                value={form[f.name]}
                onChange={e => set(f.name, e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" as const, minHeight: 72 }}
              />
            ) : (
              <input
                className="form-modal-input"
                placeholder={f.placeholder || ""}
                value={form[f.name]}
                onChange={e => set(f.name, e.target.value)}
                style={inputStyle}
              />
            )}
          </div>
        ))}

        {error && (
          <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.15)",
            fontSize: 12, color: "#ff4d6a" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: "10px 0", background: "transparent",
            border: "1px solid rgba(196,165,90,0.1)", borderRadius: 10,
            cursor: "pointer", fontSize: 12, color: C.dim, fontFamily: "'Inter', sans-serif",
          }}>Cancel</button>
          <button type="submit" disabled={submitting} style={{
            flex: 1, padding: "10px 0",
            background: "linear-gradient(135deg, rgba(196,165,90,0.1), rgba(196,165,90,0.04))",
            border: "1px solid rgba(196,165,90,0.25)", borderRadius: 10,
            cursor: submitting ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
            letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.goldLt,
            fontFamily: "'Inter', sans-serif", opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Action button (consistent "New" button) ── */
function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 10,
      background: "linear-gradient(135deg, rgba(196,165,90,0.08), rgba(196,165,90,0.03))",
      border: "1px solid rgba(196,165,90,0.15)", cursor: "pointer",
      fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
      textTransform: "uppercase" as const, color: C.goldLt,
      fontFamily: "'Inter', sans-serif", transition: "all 0.25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.3)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(196,165,90,0.05)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
    >{children}</button>
  );
}

/* ═══════════════════════════════════════════════
   DEPARTMENT DASHBOARD
   ═══════════════════════════════════════════════ */
function Dashboard({ code }: { code: string }) {
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const { user } = useTeam();
  const { canManage, canEdit, role } = useTeamRole();

  useEffect(() => {
    teamFetch("/api/team/dashboard").then(setStats).catch(() => {});
    teamFetch("/api/team/tasks").then(setTasks).catch(() => {});
  }, []);

  const meta = DEPT_META[code] || { label: "Team Portal", icon: "🏛️", desc: "" };

  const roleLabel = role === "dept_head" ? "Department Head"
    : role === "team_member" ? "Team Member"
    : role === "volunteer" ? "Volunteer"
    : role === "secretary_general" ? "Secretary General"
    : role === "deputy_sg" ? "Deputy Secretary General"
    : role === "director_general" ? "Director General"
    : role;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: C.text, marginBottom: 4 }}>
          {meta.icon} {meta.label}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>{stats?.department_description || meta.desc}</div>
        {user && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 99,
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              background: canManage ? "rgba(196,165,90,0.08)" : canEdit ? "rgba(107,128,112,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${canManage ? "rgba(196,165,90,0.2)" : canEdit ? "rgba(107,128,112,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: canManage ? C.goldLt : canEdit ? "#6b8070" : C.dim,
            }}>{roleLabel}</span>
            {canManage && <span style={{ fontSize: 10, color: C.dim }}>Full access</span>}
            {canEdit && !canManage && <span style={{ fontSize: 10, color: C.dim }}>Create & edit own tasks</span>}
            {!canEdit && <span style={{ fontSize: 10, color: C.dim }}>View only</span>}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KPI label="Open Tasks" value={stats?.open_tasks ?? "—"} />
        <KPI label="Completed" value={stats?.completed_tasks ?? "—"} />
        <KPI label="Team Members" value={stats?.team_members ?? "—"} />
        <KPI label="Total Tasks" value={stats?.total_tasks ?? "—"} />
      </div>

      <SectionTitle>Recent Tasks</SectionTitle>
      {tasks.length === 0 ? (
        <EmptyState icon="📋" message="No open tasks in your department." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.slice(0, 8).map((t: any) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              borderRadius: 10, background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{t.title}</div>
              <StatusBadge status={t.priority} />
              <StatusBadge status={t.status} />
              {t.due_date && <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>{t.due_date}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DEPARTMENT-SPECIFIC PAGES
   ═══════════════════════════════════════════════ */

/* SEC — Incidents (full CRUD with edit/delete/status) */
function IncidentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/sec/incidents").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    await teamFetch(`/api/team/sec/incidents/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this incident?")) return;
    await teamFetch(`/api/team/sec/incidents/${id}`, { method: "DELETE" });
    load();
  };
  const handleResolve = async (id: number) => {
    const resolution = prompt("Resolution notes:");
    if (resolution === null) return;
    await teamFetch(`/api/team/sec/incidents/${id}`, { method: "PUT", body: JSON.stringify({ status: "completed", resolution }) });
    load();
  };

  const statusCounts = { open: items.filter(i => i.status === "open").length, in_progress: items.filter(i => i.status === "in_progress").length, completed: items.filter(i => i.status === "completed").length };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Security Incidents</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>Report Incident</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Open" value={statusCounts.open} />
        <KPI label="In Progress" value={statusCounts.in_progress} />
        <KPI label="Resolved" value={statusCounts.completed} />
      </div>

      {items.length === 0 ? <EmptyState icon="🛡️" message="No incidents reported." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
              background: r.status === "critical" ? "rgba(255,77,106,0.03)" : "rgba(255,255,255,0.015)",
              border: `1px solid ${r.status === "critical" ? "rgba(255,77,106,0.1)" : "rgba(255,255,255,0.03)"}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  {r.location && <span>{r.location} · </span>}
                  {r.reported_by && <span>Reported by {r.reported_by} · </span>}
                  {r.description && <span style={{ color: C.muted }}>{r.description.slice(0, 80)}{r.description.length > 80 ? "..." : ""}</span>}
                </div>
              </div>
              <StatusBadge status={r.severity} />
              <StatusBadge status={r.status} />
              {canEdit && r.status !== "completed" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {r.status === "open" && (
                    <button onClick={() => handleStatusChange(r.id, "in_progress")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(107,128,112,0.1)", border: "1px solid rgba(107,128,112,0.2)", color: "#6b8070", cursor: "pointer" }}>Accept</button>
                  )}
                  {r.status === "in_progress" && (
                    <button onClick={() => handleResolve(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Resolve</button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="Report Incident" endpoint="/api/team/sec/incidents" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Title", placeholder: "Brief incident description", required: true },
          { name: "severity", label: "Severity", type: "select", options: ["low", "medium", "high", "critical"], required: true },
          { name: "location", label: "Location", placeholder: "e.g. Main Hall, Gate B" },
          { name: "description", label: "Details", type: "textarea", placeholder: "What happened..." },
        ]} />}
    </div>
  );
}

/* SEC — Zones (SecurityZone model — full CRUD) */
function ZonesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/sec/zones").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this zone?")) return;
    await teamFetch(`/api/team/sec/zones/${id}`, { method: "DELETE" });
    load();
  };
  const handleStatusToggle = async (id: number, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    await teamFetch(`/api/team/sec/zones/${id}`, { method: "PUT", body: JSON.stringify({ status: next }) });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Security Zones</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Zone</ActionButton>}
      </div>
      {items.length === 0 ? <EmptyState icon="🗺️" message="No zones configured." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "16px 18px", borderRadius: 14,
              background: r.status === "active" ? "rgba(107,128,112,0.03)" : "rgba(255,255,255,0.01)",
              border: `1px solid ${r.status === "active" ? "rgba(107,128,112,0.1)" : "rgba(255,255,255,0.03)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{r.area}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                Access: <span style={{ color: r.access_level === "restricted" ? "#ff4d6a" : C.goldLt }}>{r.access_level}</span>
              </div>
              {r.assigned_team && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Assigned: {r.assigned_team}</div>}
              {r.notes && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: "italic" }}>{r.notes}</div>}
              {(canEdit || canManage) && (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button onClick={() => handleStatusToggle(r.id, r.status)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(196,165,90,0.06)", border: "1px solid rgba(196,165,90,0.12)", color: C.gold, cursor: "pointer" }}>
                    {r.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Security Zone" endpoint="/api/team/sec/zones" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "name", label: "Zone Name", placeholder: "e.g. Main Hall North", required: true },
          { name: "area", label: "Area / Building", placeholder: "e.g. Building A" },
          { name: "access_level", label: "Access Level", type: "select", options: ["general", "restricted", "vip", "staff_only"] },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Coverage details, camera positions..." },
        ]} />}
    </div>
  );
}

/* SEC — Emergency Contacts */
function EmergencyContactsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/sec/contacts").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this contact?")) return;
    await teamFetch(`/api/team/sec/contacts/${id}`, { method: "DELETE" });
    load();
  };

  const catColors: Record<string, string> = { internal: "#c4a55a", external: "#6b8070", emergency: "#ff4d6a" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Emergency Contacts</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Contact</ActionButton>}
      </div>
      {items.length === 0 ? <EmptyState icon="📞" message="No emergency contacts registered." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{r.role}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 99,
                  background: `${catColors[r.category] || catColors.internal}10`,
                  border: `1px solid ${catColors[r.category] || catColors.internal}20`,
                  color: catColors[r.category] || catColors.internal,
                }}>{r.category}</span>
              </div>
              <div style={{ fontSize: 12, color: C.gold, fontFamily: "monospace", marginTop: 6 }}>{r.phone}</div>
              {r.notes && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{r.notes}</div>}
              {canManage && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Emergency Contact" endpoint="/api/team/sec/contacts" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "name", label: "Name", placeholder: "Full name", required: true },
          { name: "phone", label: "Phone", placeholder: "+977-...", required: true },
          { name: "role", label: "Role", placeholder: "e.g. Venue Manager" },
          { name: "category", label: "Category", type: "select", options: ["internal", "external", "emergency"] },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Availability, backup contact..." },
        ]} />}
    </div>
  );
}

/* PR — Announcements */
function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/pr/announcements").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Announcements</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Announcement</ActionButton>}
      </div>
      {items.length === 0 ? <EmptyState icon="📣" message="No announcements yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.platform}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Announcement" endpoint="/api/team/pr/announcements" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Title", placeholder: "Announcement headline", required: true },
          { name: "caption", label: "Caption", type: "textarea", placeholder: "Full text of the announcement..." },
          { name: "platform", label: "Platform", type: "select", options: ["All", "Instagram", "Facebook", "Twitter", "WhatsApp", "Website"] },
        ]} />}
    </div>
  );
}

/* PR — Contacts */
function PRContactsPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(() => teamFetch("/api/team/pr/contacts").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <SectionTitle>Media Contacts</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📰" message="No press contacts yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.outlet || r.email}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* PR — Press Releases (PressRelease model — full CRUD) */
function PressReleasesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/pr/releases").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    await teamFetch(`/api/team/pr/releases/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this press release?")) return;
    await teamFetch(`/api/team/pr/releases/${id}`, { method: "DELETE" });
    load();
  };

  const draftCount = items.filter(i => i.status === "draft").length;
  const publishedCount = items.filter(i => i.status === "published").length;
  const sentCount = items.filter(i => i.status === "sent").length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Press Releases</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Press Release</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Drafts" value={draftCount} />
        <KPI label="Published" value={publishedCount} />
        <KPI label="Sent" value={sentCount} />
      </div>

      {items.length === 0 ? <EmptyState icon="📰" message="No press releases yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{r.title}</div>
                  {r.body && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{r.body.slice(0, 200)}{r.body.length > 200 ? "..." : ""}</div>}
                  <div style={{ fontSize: 11, color: C.dim }}>
                    {r.target_outlets && <span>To: {r.target_outlets} · </span>}
                    {r.release_date && <span>Date: {r.release_date} · </span>}
                    {r.sent_by && <span>By {r.sent_by}</span>}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {canEdit && r.status === "draft" && (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button onClick={() => handleStatusChange(r.id, "published")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(196,165,90,0.06)", border: "1px solid rgba(196,165,90,0.12)", color: C.gold, cursor: "pointer" }}>Publish</button>
                  <button onClick={() => handleStatusChange(r.id, "sent")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Send</button>
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Press Release" endpoint="/api/team/pr/releases" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Headline", placeholder: "Press release title", required: true },
          { name: "body", label: "Body", type: "textarea", placeholder: "Full text of the press release..." },
          { name: "target_outlets", label: "Target Outlets", placeholder: "e.g. Kathmandu Post, The Himalayan Times" },
          { name: "release_date", label: "Release Date", placeholder: "YYYY-MM-DD" },
        ]} />}
    </div>
  );
}

/* MED — Media Gallery (MediaItem model — full CRUD with thumbnails) */
function MediaGalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/med/media").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleApproval = async (id: number, approval: string) => {
    await teamFetch(`/api/team/med/media/${id}`, { method: "PUT", body: JSON.stringify({ approval }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this media item?")) return;
    await teamFetch(`/api/team/med/media/${id}`, { method: "DELETE" });
    load();
  };

  const approvedCount = items.filter(i => i.approval === "approved").length;
  const pendingCount = items.filter(i => i.approval === "pending").length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Media Gallery</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>Upload Media</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Total" value={items.length} />
        <KPI label="Approved" value={approvedCount} />
        <KPI label="Pending" value={pendingCount} />
      </div>

      {items.length === 0 ? <EmptyState icon="📸" message="No media uploads yet." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              {r.thumbnail_url ? (
                <div style={{ width: "100%", height: 120, borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 10, overflow: "hidden" }}>
                  <img src={r.thumbnail_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ width: "100%", height: 80, borderRadius: 8, background: "rgba(196,165,90,0.03)", border: "1px solid rgba(196,165,90,0.06)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: C.dim }}>
                  {r.kind === "video" ? "🎬" : "📷"}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{r.kind} · {r.event || "Unassigned"}</div>
              {r.photographer && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>By {r.photographer}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <StatusBadge status={r.status} />
                <StatusBadge status={r.approval || "pending"} />
              </div>
              {canEdit && r.approval === "pending" && (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <button onClick={() => handleApproval(r.id, "approved")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Approve</button>
                  <button onClick={() => handleApproval(r.id, "rejected")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Reject</button>
                </div>
              )}
              {canManage && (
                <div style={{ marginTop: 4 }}>
                  <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="Upload Media" endpoint="/api/team/med/media" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "name", label: "Title", placeholder: "Photo/video title", required: true },
          { name: "kind", label: "Type", type: "select", options: ["photo", "video", "document"] },
          { name: "url", label: "URL / File Link", placeholder: "https://..." },
          { name: "thumbnail_url", label: "Thumbnail URL", placeholder: "https://..." },
          { name: "event", label: "Event", placeholder: "e.g. Opening Ceremony" },
          { name: "tags", label: "Tags", placeholder: "e.g. ceremony, formal, group" },
        ]} />}
    </div>
  );
}

/* MED — Archive (actual archived media) */
function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/med/archive").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Archived Media</SectionTitle>
      {items.length === 0 ? <EmptyState icon="🗄️" message="No archived media yet." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)",
              opacity: 0.7,
            }}>
              {r.thumbnail_url ? (
                <div style={{ width: "100%", height: 100, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
                  <img src={r.thumbnail_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(30%)" }} />
                </div>
              ) : null}
              <div style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{r.kind} · {r.event || "—"}</div>
              <div style={{ marginTop: 6 }}><StatusBadge status={r.status} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* MED — Videos (video production tracker) */
function VideosPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/med/videos").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const filmingCount = items.filter(i => i.status === "filming").length;
  const editingCount = items.filter(i => i.status === "editing").length;
  const doneCount = items.filter(i => i.status === "done").length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Video Production</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Video</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Filming" value={filmingCount} />
        <KPI label="Editing" value={editingCount} />
        <KPI label="Done" value={doneCount} />
      </div>

      {items.length === 0 ? <EmptyState icon="🎬" message="No videos in production." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ fontSize: 20, color: C.dim }}>🎬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  {r.kind} · Editor: {r.editor || "Unassigned"}
                  {r.deadline && <span> · Due: {r.deadline}</span>}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Video Project" endpoint="/api/team/med/videos" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Title", placeholder: "Video title", required: true },
          { name: "kind", label: "Type", type: "select", options: ["Reel", "Documentary", "Interview", "Highlight", "Recap", "Promo"] },
          { name: "script", label: "Script / Outline", type: "textarea", placeholder: "Scene breakdown, interview questions..." },
          { name: "deadline", label: "Deadline", placeholder: "YYYY-MM-DD" },
        ]} />}
    </div>
  );
}

/* Schedule — shared by SEC, MED, ORG */
function SchedulePage({ endpoint }: { endpoint: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch(endpoint).then(setItems).catch(() => {}); }, [endpoint]);
  return (
    <div>
      <SectionTitle>Schedule</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📅" message="No schedule items." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", minWidth: 80 }}>{r.date || r.shift_date}</div>
              <div style={{ fontSize: 11, color: C.dim, minWidth: 100 }}>{r.start} — {r.end}</div>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{r.zone || r.role}</div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* MKT — Campaigns */
function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/mkt/campaigns").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Campaigns</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📊" message="No campaigns yet." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>{r.objective}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <StatusBadge status={r.status} />
                {r.platforms?.split(",").map((p: string) => (
                  <span key={p} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(196,165,90,0.04)", border: "1px solid rgba(196,165,90,0.08)", color: C.dim }}>{p.trim()}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* MKT — Content */
function ContentPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/mkt/content").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Content</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Content</ActionButton>}
      </div>
      {items.length === 0 ? <EmptyState icon="✏️" message="No content items." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.content_type} · {r.platform}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Content" endpoint="/api/team/mkt/content" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Title", placeholder: "Content title", required: true },
          { name: "content_type", label: "Type", type: "select", options: ["Post", "Reel", "Story", "Carousel", "Video", "Article"] },
          { name: "platform", label: "Platform", type: "select", options: ["Instagram", "Facebook", "Twitter", "TikTok", "YouTube", "Website"] },
          { name: "caption", label: "Caption", type: "textarea", placeholder: "Caption or draft text..." },
        ]} />}
    </div>
  );
}

/* MKT — Ideas */
function IdeasPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/mkt/ideas").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Content Ideas</SectionTitle>
      {items.length === 0 ? <EmptyState icon="💡" message="No ideas submitted yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.format} · {r.platform}</div>
              </div>
              <div style={{ fontSize: 11, color: C.dim }}>👍 {r.votes}</div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ORG — Volunteers */
function VolunteersPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/org/volunteers").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Volunteers</SectionTitle>
      {items.length === 0 ? <EmptyState icon="👥" message="No volunteers assigned." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace" }}>{r.reference}</div>
              </div>
              <StatusBadge status={r.status} />
              <StatusBadge status={r.availability} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ORG — Supplies (logistics CRUD with SupplyItem model) */
function SuppliesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/org/supplies").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    await teamFetch(`/api/team/org/supplies/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this supply item?")) return;
    await teamFetch(`/api/team/org/supplies/${id}`, { method: "DELETE" });
    load();
  };

  const totalCost = items.reduce((sum: number, i: any) => sum + (Number(i.cost) || 0), 0);
  const requestedCount = items.filter(i => i.status === "requested").length;
  const deliveredCount = items.filter(i => i.status === "delivered").length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Supplies & Logistics</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Supply Request</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Requested" value={requestedCount} />
        <KPI label="Delivered" value={deliveredCount} />
        <KPI label="Total Cost" value={`$${totalCost.toLocaleString()}`} />
      </div>

      {items.length === 0 ? <EmptyState icon="📦" message="No supply items tracked." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.item}</div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  Qty: {r.quantity} · {r.category} · {r.vendor || "No vendor"}
                  {r.cost > 0 && <span> · ${Number(r.cost).toLocaleString()}</span>}
                </div>
              </div>
              <StatusBadge status={r.status} />
              {canEdit && r.status !== "delivered" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {r.status === "requested" && (
                    <button onClick={() => handleStatusChange(r.id, "ordered")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(196,165,90,0.06)", border: "1px solid rgba(196,165,90,0.12)", color: C.gold, cursor: "pointer" }}>Order</button>
                  )}
                  {r.status === "ordered" && (
                    <button onClick={() => handleStatusChange(r.id, "delivered")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Delivered</button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Supply Request" endpoint="/api/team/org/supplies" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "item", label: "Item", placeholder: "e.g. Water bottles (500 pcs)", required: true },
          { name: "category", label: "Category", type: "select", options: ["general", "food", "beverage", "printing", "decor", "equipment", "stationery"] },
          { name: "quantity", label: "Quantity", placeholder: "1" },
          { name: "vendor", label: "Vendor", placeholder: "Supplier name" },
          { name: "cost", label: "Est. Cost ($)", placeholder: "0" },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Delivery details, special requirements..." },
        ]} />}
    </div>
  );
}

/* ACA — Committees */
function CommitteesPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/aca/committees").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Committees</SectionTitle>
      {items.length === 0 ? <EmptyState icon="🏛️" message="No committees configured." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{r.agenda}</div>
              <div style={{ fontSize: 11, color: C.dim }}>Chair: {r.chair} · Room: {r.room} · Cap: {r.capacity}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ACA — Guides */
function GuidesPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/guides").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Study Guides</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📚" message="No study guides available." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.kind}</div>
              </div>
              {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.gold, textDecoration: "none" }}>Download</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ACA — Sessions */
function SessionsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/aca/sessions").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Committee Sessions</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📋" message="No sessions scheduled." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: "monospace", minWidth: 80 }}>{r.session_date}</div>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{r.title}</div>
              <div style={{ fontSize: 11, color: C.dim }}>Room: {r.room}</div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* OUT — Schools (SchoolContact model — outreach pipeline) */
function SchoolsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/out/schools").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    await teamFetch(`/api/team/out/schools/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this school contact?")) return;
    await teamFetch(`/api/team/out/schools/${id}`, { method: "DELETE" });
    load();
  };

  const prospectCount = items.filter(i => i.status === "prospect").length;
  const contactedCount = items.filter(i => i.status === "contacted").length;
  const confirmedCount = items.filter(i => i.status === "confirmed").length;
  const totalStudents = items.reduce((sum: number, i: any) => sum + (Number(i.students_estimate) || 0), 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>School Outreach</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New School</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Prospects" value={prospectCount} />
        <KPI label="Contacted" value={contactedCount} />
        <KPI label="Confirmed" value={confirmedCount} />
        <KPI label="Est. Students" value={totalStudents} />
      </div>

      {items.length === 0 ? <EmptyState icon="🏫" message="No school contacts yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.school_name}</div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  {r.city && <span>{r.city} · </span>}
                  {r.contact_person && <span>{r.contact_person} · </span>}
                  {r.students_estimate > 0 && <span>~{r.students_estimate} students · </span>}
                  {r.email && <span style={{ color: C.muted }}>{r.email}</span>}
                </div>
              </div>
              <StatusBadge status={r.status} />
              {canEdit && r.status !== "confirmed" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {r.status === "prospect" && (
                    <button onClick={() => handleStatusChange(r.id, "contacted")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(196,165,90,0.06)", border: "1px solid rgba(196,165,90,0.12)", color: C.gold, cursor: "pointer" }}>Contact</button>
                  )}
                  {r.status === "contacted" && (
                    <button onClick={() => handleStatusChange(r.id, "confirmed")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Confirm</button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New School Contact" endpoint="/api/team/out/schools" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "school_name", label: "School Name", placeholder: "e.g. Kathmandu International School", required: true },
          { name: "city", label: "City", placeholder: "e.g. Kathmandu" },
          { name: "contact_person", label: "Contact Person", placeholder: "Full name" },
          { name: "email", label: "Email", placeholder: "email@school.edu" },
          { name: "phone", label: "Phone", placeholder: "+977-..." },
          { name: "students_estimate", label: "Est. Students", placeholder: "50" },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Previous participation, contact preferences..." },
        ]} />}
    </div>
  );
}

/* OUT — Ambassadors (shared with BA) */
function AmbassadorsPage({ endpoint = "/api/team/out/ambassadors", showCreate = true }: { endpoint?: string; showCreate?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit } = useTeamRole();
  const load = useCallback(() => teamFetch(endpoint).then(setItems).catch(() => {}), [endpoint]);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Ambassadors</SectionTitle>
        {showCreate && canEdit && <ActionButton onClick={() => setShowForm(true)}>New Ambassador</ActionButton>}
      </div>
      {items.length === 0 ? <EmptyState icon="🌟" message="No ambassadors yet." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{r.institution}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{r.handle} · {r.platform}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <StatusBadge status={r.status} />
                <span style={{ fontSize: 10, color: C.dim }}>Code: {r.code}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Ambassador" endpoint={endpoint} onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "name", label: "Name", placeholder: "Full name", required: true },
          { name: "institution", label: "Institution", placeholder: "School or organization" },
          { name: "platform", label: "Platform", type: "select", options: ["Instagram", "TikTok", "YouTube", "Twitter", "Facebook", "LinkedIn"] },
          { name: "handle", label: "Handle / Username", placeholder: "@username" },
          { name: "code", label: "Referral Code", placeholder: "Unique code" },
        ]} />}
    </div>
  );
}

/* TECH — Tickets (full CRUD with categories + status actions) */
function TicketsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { canEdit, canManage } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/tech/tickets").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    await teamFetch(`/api/team/tech/tickets/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ticket?")) return;
    await teamFetch(`/api/team/tech/tickets/${id}`, { method: "DELETE" });
    load();
  };

  const openCount = items.filter(i => i.status === "open").length;
  const inProgressCount = items.filter(i => i.status === "in_progress").length;
  const resolvedCount = items.filter(i => i.status === "resolved").length;
  const criticalCount = items.filter(i => i.priority === "critical" || i.priority === "high").length;

  const categoryIcons: Record<string, string> = { wifi: "📶", projector: "📽️", audio: "🔊", network: "🌐", power: "⚡", general: "🔧" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Support Tickets</SectionTitle>
        {canEdit && <ActionButton onClick={() => setShowForm(true)}>New Ticket</ActionButton>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        <KPI label="Open" value={openCount} />
        <KPI label="In Progress" value={inProgressCount} />
        <KPI label="Resolved" value={resolvedCount} />
        <KPI label="High Priority" value={criticalCount} />
      </div>

      {items.length === 0 ? <EmptyState icon="🎫" message="No support tickets." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
              background: r.priority === "critical" ? "rgba(255,77,106,0.03)" : "rgba(255,255,255,0.015)",
              border: `1px solid ${r.priority === "critical" ? "rgba(255,77,106,0.1)" : "rgba(255,255,255,0.03)"}`,
            }}>
              <div style={{ fontSize: 18, color: C.dim }}>{categoryIcons[r.category] || "🔧"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  {r.category && <span>{r.category} · </span>}
                  {r.room && <span>Room {r.room} · </span>}
                  {r.reported_by && <span>by {r.reported_by} · </span>}
                  {r.description && <span style={{ color: C.muted }}>{r.description.slice(0, 60)}{r.description.length > 60 ? "..." : ""}</span>}
                </div>
              </div>
              <StatusBadge status={r.priority} />
              <StatusBadge status={r.status} />
              {canEdit && r.status !== "resolved" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {r.status === "open" && (
                    <button onClick={() => handleStatusChange(r.id, "in_progress")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(107,128,112,0.1)", border: "1px solid rgba(107,128,112,0.2)", color: "#6b8070", cursor: "pointer" }}>Accept</button>
                  )}
                  {r.status === "in_progress" && (
                    <button onClick={() => handleStatusChange(r.id, "resolved")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" }}>Resolve</button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(r.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,77,106,0.06)", border: "1px solid rgba(255,77,106,0.12)", color: "#ff4d6a", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FormModal title="New Support Ticket" endpoint="/api/team/tech/tickets" onCreated={load} onClose={() => setShowForm(false)}
        fields={[
          { name: "title", label: "Title", placeholder: "What needs attention?", required: true },
          { name: "category", label: "Category", type: "select", options: ["wifi", "projector", "audio", "network", "power", "general"] },
          { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"], required: true },
          { name: "room", label: "Room", placeholder: "e.g. Main Hall" },
          { name: "description", label: "Description", type: "textarea", placeholder: "Details about the issue..." },
        ]} />}
    </div>
  );
}

/* TECH — Equipment */
function EquipmentPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/tech/equipment").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Equipment</SectionTitle>
      {items.length === 0 ? <EmptyState icon="🔧" message="No equipment tracked." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.item}</div>
                <div style={{ fontSize: 11, color: C.dim }}>Qty: {r.quantity}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* TECH — Room Status (Room model) */
function RoomStatusPage() {
  const [items, setItems] = useState<any[]>([]);
  const { canEdit } = useTeamRole();
  const load = useCallback(() => teamFetch("/api/team/tech/rooms").then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleAssignment = async (id: number) => {
    const assignment = prompt("Room assignment (e.g. 'MUN sessions', 'Media ops'):");
    if (assignment === null) return;
    await teamFetch(`/api/team/tech/rooms/${id}`, { method: "PUT", body: JSON.stringify({ assignment }) });
    load();
  };

  return (
    <div>
      <SectionTitle>Room Status & Assignments</SectionTitle>
      {items.length === 0 ? <EmptyState icon="🏠" message="No rooms configured." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{
              padding: "16px 18px", borderRadius: 14,
              background: r.assignment ? "rgba(107,128,112,0.03)" : "rgba(255,255,255,0.01)",
              border: `1px solid ${r.assignment ? "rgba(107,128,112,0.1)" : "rgba(255,255,255,0.03)"}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: C.dim }}>Capacity: {r.capacity || "—"}</div>
              {r.assignment ? (
                <div style={{ marginTop: 6, fontSize: 12, color: C.goldLt, fontWeight: 500 }}>
                  📌 {r.assignment}
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 11, color: C.dim, fontStyle: "italic" }}>Unassigned</div>
              )}
              {canEdit && (
                <button onClick={() => handleAssignment(r.id)} style={{ marginTop: 8, fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(196,165,90,0.06)", border: "1px solid rgba(196,165,90,0.12)", color: C.gold, cursor: "pointer" }}>
                  {r.assignment ? "Reassign" : "Assign"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* BA — Metrics */
function MetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  useEffect(() => { teamFetch("/api/team/ba/metrics").then(setMetrics).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Performance Metrics</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPI label="Total Ambassadors" value={metrics?.total_ambassadors ?? "—"} />
        <KPI label="Active" value={metrics?.active_ambassadors ?? "—"} />
        <KPI label="Registrations" value={metrics?.total_registrations ?? "—"} />
      </div>
    </div>
  );
}

/* BA — Ambassadors (uses BA endpoint) */
function BAAmbassadorsPage() { return <AmbassadorsPage endpoint="/api/team/ba/ambassadors" />; }

/* BA — Content (read-only view of all content) */
function BAContentPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { teamFetch("/api/team/ba/content").then(setItems).catch(() => {}); }, []);
  return (
    <div>
      <SectionTitle>Content Performance</SectionTitle>
      {items.length === 0 ? <EmptyState icon="📊" message="No content tracked." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((r: any) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{r.content_type} · {r.platform}</div>
              </div>
              {r.metrics_reach != null && <div style={{ fontSize: 10, color: C.dim }}>👁 {r.metrics_reach}</div>}
              {r.metrics_engagement != null && <div style={{ fontSize: 10, color: C.dim }}>💬 {r.metrics_engagement}</div>}
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN ROUTER
   ═══════════════════════════════════════════════ */
const PAGE_MAP: Record<string, FC> = {
  // SEC
  "incidents": IncidentsPage,
  "zones": ZonesPage,
  "emergency-contacts": EmergencyContactsPage,
  // PR
  "announcements": AnnouncementsPage,
  "press-releases": PressReleasesPage,
  "contacts": PRContactsPage,
  // MED
  "media": MediaGalleryPage,
  "videos": VideosPage,
  "archive": ArchivePage,
  // MKT
  "campaigns": CampaignsPage,
  "content": ContentPage,
  "ideas": IdeasPage,
  // ORG
  "volunteers": VolunteersPage,
  "supplies": SuppliesPage,
  // ACA
  "committees": CommitteesPage,
  "guides": GuidesPage,
  "sessions": SessionsPage,
  // OUT
  "schools": SchoolsPage,
  "ambassadors": AmbassadorsPage,
  // TECH
  "tickets": TicketsPage,
  "equipment": EquipmentPage,
  "rooms": RoomStatusPage,
  // BA
  "ba-ambassadors": BAAmbassadorsPage,
  "ba-content": BAContentPage,
  "metrics": MetricsPage,
};

/* Schedule — department-aware wrapper */
function ScheduleRouter() {
  const { user } = useTeam();
  const code = user?.department_code || "";
  const endpoints: Record<string, string> = {
    SEC: "/api/team/sec/schedule",
    MED: "/api/team/med/schedule",
    ORG: "/api/team/org/schedule",
    TECH: "/api/team/tech/schedule",
  };
  return <SchedulePage endpoint={endpoints[code] || "/api/team/schedule"} />;
}

export function TeamDepartmentPortal() {
  const { user } = useTeam();
  const code = user?.department_code || "";

  /* Determine which page to show based on URL path */
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  // /team or /team/{section}
  const section = pathParts.length >= 3 ? pathParts[2] : "";

  if (section === "schedule") {
    return <ScheduleRouter />;
  }
  if (section && PAGE_MAP[section]) {
    const Page = PAGE_MAP[section];
    return <Page />;
  }

  /* Default: dashboard */
  return <Dashboard code={code} />;
}
