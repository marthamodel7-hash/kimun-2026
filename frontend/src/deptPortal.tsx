import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";

type VolUser = { id: number; name: string; reference: string; department_id: number; role: string };
const Ctx = createContext<{ user: VolUser | null; logout: () => void }>({ user: null, logout: () => {} });

export function DeptPortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VolUser | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("dept_user");
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);
  const logout = () => { localStorage.removeItem("dept_token"); localStorage.removeItem("dept_user"); window.location.href = "/apply/portal/login"; };
  return <Ctx.Provider value={{ user, logout }}>{children}</Ctx.Provider>;
}

export const useDeptPortal = () => useContext(Ctx);

export function DeptPortalGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("dept_token");
  if (!token) return <Navigate to="/apply/portal/login" replace />;
  return <>{children}</>;
}

export function deptFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("dept_token") || "";
  return fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers as Record<string, string> || {}) },
  }).then(async r => {
    if (r.status === 401) { localStorage.removeItem("dept_token"); localStorage.removeItem("dept_user"); window.location.href = "/apply/portal/login"; throw new Error("Unauthorized"); }
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Request failed");
    return data;
  });
}

export function DeptPortalLayout() {
  const { user, logout } = useDeptPortal();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{
        width: 220, flexShrink: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(30px) saturate(1.5)",
        borderRight: "1px solid rgba(255,255,255,0.08)", padding: "20px 12px", position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        <img src="/kimun-logo.png" alt="KIMUN" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", marginBottom: 8, boxShadow: "0 0 14px rgba(196,165,90,0.25), 0 0 30px rgba(196,165,90,0.10)", border: "1.5px solid rgba(196,165,90,0.2)" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: "#c4a55a", marginBottom: 4 }}>KIMUN 2026</div>
        <div style={{ fontSize: 11, color: "#6b7a90", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 20 }}>Department Portal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { to: "/apply/portal", label: "Profile", icon: "👤" },
            { to: "/apply/portal/tasks", label: "My Tasks", icon: "📋" },
            { to: "/apply/portal/guides", label: "Guides", icon: "📚" },
          ].map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === "/apply/portal"}
              style={({ isActive }) => ({
                display: "block", padding: "8px 12px", borderRadius: 10, fontSize: 14, color: "#e8ecf2",
                textDecoration: "none", opacity: isActive ? 1 : 0.7,
                background: isActive ? "rgba(0,212,255,0.06)" : "transparent",
                border: isActive ? "1px solid rgba(0,212,255,0.15)" : "1px solid transparent",
              })}>
              <span style={{ marginRight: 8 }}>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </div>
        {user && (
          <div style={{ marginTop: 24, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#6b7a90", fontFamily: "monospace" }}>{user.reference}</div>
            <button className="btn ghost" style={{ marginTop: 8, width: "100%", fontSize: 12, padding: "6px 10px" }} onClick={logout}>Logout</button>
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: "26px clamp(16px, 3vw, 40px)", maxWidth: 1200 }}>
        <Outlet />
      </div>
    </div>
  );
}
