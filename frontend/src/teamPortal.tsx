/**
 * teamPortal.tsx — Team member authentication + portal layout.
 * JWT namespace: team:<REF>
 * localStorage: team_token, team_user
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";

export type TeamUser = {
  id: number; name: string; reference: string;
  department_id: number; department_code: string;
  department_name: string; role: string;
};

type TeamCtx = { user: TeamUser | null; logout: () => void };
const Ctx = createContext<TeamCtx>({ user: null, logout: () => {} });

/* ── Department metadata ── */
export const DEPT_META: Record<string, { label: string; icon: string; desc: string }> = {
  SEC:  { label: "Security Operations",   icon: "🛡️", desc: "Venue security, access control, incident response" },
  PR:   { label: "Public Relations",       icon: "📣", desc: "Communications, press, media relations" },
  MED:  { label: "Media & Documentation",  icon: "📸", desc: "Photography, videography, content capture" },
  MKT:  { label: "Marketing",              icon: "📊", desc: "Campaigns, social media, brand management" },
  ORG:  { label: "Organizing Committee",   icon: "⚙️", desc: "Operations, volunteer management, logistics" },
  ACA:  { label: "Academics",              icon: "📚", desc: "Committees, study guides, academic resources" },
  OUT:  { label: "Outreach",               icon: "🤝", desc: "Schools, partnerships, ambassador recruitment" },
  TECH: { label: "Technical Assistance",   icon: "💻", desc: "IT support, equipment, system maintenance" },
  BA:   { label: "Brand Ambassadors",      icon: "🌟", desc: "Influencer partnerships, content creation" },
};

/* ── Department-specific nav links ── */
const DEPT_NAV: Record<string, { to: string; label: string }[]> = {
  SEC:  [{ to: "/team", label: "Dashboard" }, { to: "/team/incidents", label: "Incidents" }, { to: "/team/zones", label: "Zones" }, { to: "/team/emergency-contacts", label: "Contacts" }, { to: "/team/schedule", label: "Schedule" }],
  PR:   [{ to: "/team", label: "Dashboard" }, { to: "/team/announcements", label: "Announcements" }, { to: "/team/press-releases", label: "Press Releases" }, { to: "/team/contacts", label: "Contacts" }],
  MED:  [{ to: "/team", label: "Dashboard" }, { to: "/team/media", label: "Media Gallery" }, { to: "/team/videos", label: "Videos" }, { to: "/team/archive", label: "Archive" }, { to: "/team/schedule", label: "Schedule" }],
  MKT:  [{ to: "/team", label: "Dashboard" }, { to: "/team/campaigns", label: "Campaigns" }, { to: "/team/content", label: "Content" }, { to: "/team/ideas", label: "Ideas" }],
  ORG:  [{ to: "/team", label: "Dashboard" }, { to: "/team/volunteers", label: "Volunteers" }, { to: "/team/supplies", label: "Supplies" }, { to: "/team/schedule", label: "Schedule" }],
  ACA:  [{ to: "/team", label: "Dashboard" }, { to: "/team/committees", label: "Committees" }, { to: "/team/guides", label: "Guides" }, { to: "/team/sessions", label: "Sessions" }],
  OUT:  [{ to: "/team", label: "Dashboard" }, { to: "/team/schools", label: "Schools" }, { to: "/team/ambassadors", label: "Ambassadors" }, { to: "/team/contacts", label: "Contacts" }],
  TECH: [{ to: "/team", label: "Dashboard" }, { to: "/team/tickets", label: "Tickets" }, { to: "/team/equipment", label: "Equipment" }, { to: "/team/rooms", label: "Room Status" }, { to: "/team/schedule", label: "Schedule" }],
  BA:   [{ to: "/team", label: "Dashboard" }, { to: "/team/ba-ambassadors", label: "Ambassadors" }, { to: "/team/ba-content", label: "Content" }, { to: "/team/metrics", label: "Metrics" }],
};

export function TeamProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TeamUser | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("team_user");
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);
  const logout = () => {
    localStorage.removeItem("team_token");
    localStorage.removeItem("team_user");
    window.location.href = "/team/login";
  };
  return <Ctx.Provider value={{ user, logout }}>{children}</Ctx.Provider>;
}

export const useTeam = () => useContext(Ctx);

/* ── Role-based access control ── */
const EXECUTIVE_ROLES = new Set(["secretary_general", "deputy_sg", "director_general", "super_admin"]);
const MANAGE_ROLES = new Set(["secretary_general", "deputy_sg", "director_general", "super_admin", "dept_head"]);
const EDIT_ROLES = new Set(["secretary_general", "deputy_sg", "director_general", "super_admin", "dept_head", "team_member"]);

export type TeamRole = {
  /** Can manage department members, delete any item, full CRUD */
  canManage: boolean;
  /** Can create items and edit own tasks */
  canEdit: boolean;
  /** Can only view — no create/edit/delete */
  isReadOnly: boolean;
  /** Is executive body (SG, DSG, etc.) */
  isExecutive: boolean;
  /** Raw role string */
  role: string;
};

export function useTeamRole(): TeamRole {
  const { user } = useTeam();
  const role = user?.role || "";
  const isExecutive = EXECUTIVE_ROLES.has(role);
  const canManage = MANAGE_ROLES.has(role);
  const canEdit = EDIT_ROLES.has(role);
  return { canManage, canEdit, isReadOnly: !canEdit, isExecutive, role };
}

export function TeamGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("team_token");
  if (!token) return <Navigate to="/team/login" replace />;
  return <>{children}</>;
}

export function teamFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("team_token") || "";
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers as Record<string, string> || {}),
    },
  }).then(async r => {
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem("team_token");
      localStorage.removeItem("team_user");
      window.location.href = "/team/login";
      throw new Error("Unauthorized");
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Request failed");
    return data;
  });
}

/* ═══════════════════════════════════════════════
   useMQ — responsive breakpoint hook
   ═══════════════════════════════════════════════ */
function useMQ() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { sm: w < 640, md: w < 1024, width: w };
}

/* ═══════════════════════════════════════════════
   TEAM PORTAL LAYOUT — responsive sidebar
   ═══════════════════════════════════════════════ */
const _sideStyle: React.CSSProperties = {
  background: "rgba(4,6,12,0.92)",
  backdropFilter: "blur(40px) saturate(1.8)", WebkitBackdropFilter: "blur(40px) saturate(1.8)",
  borderRight: "1px solid rgba(196,165,90,0.08)",
  padding: "24px 16px", display: "flex", flexDirection: "column",
  overflowY: "auto",
};

export function TeamPortalLayout() {
  const { user, logout } = useTeam();
  const location = useLocation();
  const { sm, md } = useMQ();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const code = user?.department_code || "";
  const meta = DEPT_META[code] || { label: "Team Portal", icon: "🏛️", desc: "" };
  const navLinks = DEPT_NAV[code] || [];

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const sidebarWidth = sm ? 280 : md ? 240 : 260;

  const sidebarContent = (
    <>
      {/* Gold top line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.15) 30%, rgba(196,165,90,0.08) 70%, transparent)" }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <img src="/kimun-logo.png" alt="KIMUN" style={{
          width: 36, height: 36, borderRadius: 8, objectFit: "cover",
          border: "1.5px solid rgba(196,165,90,0.2)",
          boxShadow: "0 0 14px rgba(196,165,90,0.2)",
        }} />
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: "#c4a55a", letterSpacing: 1.5 }}>KIMUN 2026</div>
          <div style={{ fontSize: 9, color: "#5a5048", letterSpacing: 3, textTransform: "uppercase" as const }}>Team Operations</div>
        </div>
      </div>

      {/* Department badge */}
      <div style={{
        padding: "10px 14px", borderRadius: 12, marginBottom: 20,
        background: "rgba(196,165,90,0.04)", border: "1px solid rgba(196,165,90,0.08)",
      }}>
        <div style={{ fontSize: 14, marginBottom: 2 }}>{meta.icon} {meta.label}</div>
        <div style={{ fontSize: 10, color: "#5a5048", lineHeight: 1.4 }}>{meta.desc}</div>
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {navLinks.map(l => {
          const isActive = l.to === "/team"
            ? location.pathname === "/team" || location.pathname === `/${code}`
            : location.pathname.startsWith(l.to) && l.to !== "/team";
          return (
            <NavLink key={l.to} to={l.to} style={{
              display: "block", padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
              color: isActive ? "#e8f0f8" : "#8a8070", textDecoration: "none",
              background: isActive ? "rgba(196,165,90,0.06)" : "transparent",
              border: isActive ? "1px solid rgba(196,165,90,0.12)" : "1px solid transparent",
              transition: "all 0.25s",
            }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "#d4bc7a"; e.currentTarget.style.background = "rgba(196,165,90,0.03)"; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "#8a8070"; e.currentTarget.style.background = "transparent"; }}}
            >{l.label}</NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      {user && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(196,165,90,0.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e8f0f8", marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: 10, color: "#5a5048", fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 6 }}>{user.reference}</div>
          <div style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 99,
            fontSize: 9, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10,
            background: user.role === "dept_head" ? "rgba(196,165,90,0.08)" : user.role === "volunteer" ? "rgba(255,255,255,0.04)" : "rgba(107,128,112,0.06)",
            border: `1px solid ${user.role === "dept_head" ? "rgba(196,165,90,0.15)" : user.role === "volunteer" ? "rgba(255,255,255,0.06)" : "rgba(107,128,112,0.12)"}`,
            color: user.role === "dept_head" ? "#d4bc7a" : user.role === "volunteer" ? "#5a5048" : "#6b8070",
          }}>
            {user.role === "dept_head" ? "Department Head" : user.role === "team_member" ? "Team Member" : user.role === "volunteer" ? "Volunteer" : user.role}
          </div>
          <button onClick={logout} style={{
            width: "100%", padding: "7px 0", background: "rgba(196,165,90,0.04)",
            border: "1px solid rgba(196,165,90,0.08)", borderRadius: 8, cursor: "pointer",
            fontSize: 11, color: "#8a8070", transition: "all 0.25s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.2)"; e.currentTarget.style.color = "#c4a55a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.08)"; e.currentTarget.style.color = "#8a8070"; }}
          >Logout</button>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#020305", position: "relative" }}>
      {/* Mobile hamburger button */}
      {sm && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(4,6,12,0.85)", border: "1px solid rgba(196,165,90,0.15)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.15)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a55a" strokeWidth="2" strokeLinecap="round">
            {sidebarOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            ) : (
              <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            )}
          </svg>
        </button>
      )}

      {/* Mobile overlay */}
      {sm && sidebarOpen && (
        <div
          ref={overlayRef}
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 150,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* Sidebar — desktop: static; mobile: slide-out overlay */}
      {sm ? (
        <aside style={{
          ..._sideStyle,
          position: "fixed", top: 0, left: 0, bottom: 0, width: sidebarWidth, zIndex: 160,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside style={{
          ..._sideStyle,
          width: sidebarWidth, flexShrink: 0,
          position: "sticky", top: 0, height: "100vh",
        }}>
          {sidebarContent}
        </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: sm ? "64px 16px 24px" : "28px clamp(16px, 3vw, 40px)", maxWidth: 1200, minWidth: 0 }}>
        <Outlet />
      </main>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
