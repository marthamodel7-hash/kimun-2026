import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const LEAD = ["super_admin", "secretary_general", "deputy_sg", "director_general"];
const STAFF = [...LEAD, "dept_head", "team_member"];
// Mirrors backend PERMISSIONS in app/deps.py — the server still enforces on every call.
const NAV: [string, [string, string, string[]][]][] = [
  ["Command Center", [["/", "Dashboard", [...STAFF, "volunteer"]], ["/reports", "Event Report", STAFF], ["/activity", "Activity & Audit", STAFF], ["/notifications", "Notifications", [...STAFF, "volunteer"]]]],
  ["Operations", [["/tasks", "Tasks", [...STAFF, "volunteer"]], ["/team", "Team", STAFF], ["/ops/applications", "Applications", STAFF], ["/timeline", "Timeline", STAFF], ["/approvals", "Approvals", [...LEAD, "dept_head"]], ["/risks", "Risks", STAFF], ["/control", "Event Control", [...STAFF, "volunteer"]]]],
  ["Academics", [["/delegates", "Delegates", STAFF], ["/groups", "Delegations", STAFF], ["/allocation", "Allocation", STAFF], ["/committees", "Committees", STAFF], ["/checkin", "Check-in", [...STAFF, "volunteer"]]]],
  ["Business", [["/sponsors", "Sponsors", STAFF], ["/finance", "Finance", [...LEAD, "dept_head"]], ["/procurement", "Vendors & Procurement", STAFF]]],
  ["Logistics", [["/venue", "Venue & Logistics", STAFF]]],
  ["Media & Marketing", [["/media", "Media Command Center", STAFF], ["/ai", "AI Studio (Gemini)", STAFF]]],
  ["Documents", [["/documents", "Document Vault", STAFF]]],
  ["System", [["/settings", "Settings & AI Config", LEAD]]]
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <img src="/kimun-logo.png" alt="KIMUN" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover", boxShadow: "0 0 14px rgba(196,165,90,0.25), 0 0 30px rgba(196,165,90,0.10)", border: "1.5px solid rgba(196,165,90,0.2)" }} />
          <div className="brand">KIMUN 2026<small>Operations Center</small></div>
        </div>
        <div className="nav">
          {NAV.map(([sec, links]) => {
            const vis = links.filter(([, , roles]) => !user || roles.includes(user.role));
            if (!vis.length) return null;
            return (
              <div key={sec}>
                <div className="nav-sec">{sec}</div>
                {vis.map(([to, label]) => (
                  <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")} onClick={() => setOpen(false)}>{label}</NavLink>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt muted" style={{ fontSize: 12 }}>{user?.name}<br />{user?.role}</div>
        <button className="btn ghost mt" onClick={logout}>Logout</button>
      </aside>
      <div className="main">
        <div className="topbar">
          <button className="btn ghost menu-btn" onClick={() => setOpen(!open)}>☰ Menu</button>
          <SearchBox />
          <NotifBadge />
          <div className="muted" style={{ fontSize: 13 }}>Demo seed rows are tagged <b>[DEMO]</b> — fictional, never real data.</div>
        </div>
        {children}
        <div className="toast" id="toasts" />
      </div>
    </div>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Record<string, { id: number; text: string; link: string }[]> | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (q.trim().length < 2) { setRes(null); return; }
    t.current = setTimeout(() => {
      api.get(`/api/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => setRes(null));
    }, 250);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [q]);
  const count = res ? Object.values(res).reduce((a, g) => a + g.length, 0) : 0;
  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      <input placeholder="⌕ Search delegates, tasks, sponsors, content…" value={q} onChange={(e) => setQ(e.target.value)} />
      {res && (
        <div className="glass" style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 60, maxHeight: 380, overflowY: "auto" }}>
          {!count && <div className="muted">No matches.</div>}
          {Object.entries(res).map(([g, items]) => (
            <div key={g} className="mt">
              <div className="nav-sec">{g}</div>
              {items.map((r) => <div key={g + r.id} style={{ padding: "4px 0" }}><Link to={r.link} onClick={() => { setQ(""); setRes(null); }}>{r.text}</Link></div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotifBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const poll = () => api.get("/api/notifications/unread").then((d) => setN(d.unread)).catch(() => {});
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <Link to="/notifications" style={{ position: "relative", textDecoration: "none", fontSize: 20, padding: "2px 8px" }}>
      🔔{n > 0 && <span style={{ position: "absolute", top: -2, right: -4, background: "#ff3366", color: "#fff", borderRadius: 999, fontSize: 10, padding: "1px 5px", fontWeight: 700 }}>{n}</span>}
    </Link>
  );
}
