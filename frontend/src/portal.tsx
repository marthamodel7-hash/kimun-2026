import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";

type Delegate = { id: number; name: string; reference: string; pay_status: string; reg_status: string };
const Ctx = createContext<{ delegate: Delegate | null; logout: () => void }>({ delegate: null, logout: () => {} });

export function PortalProvider({ children }: { children: ReactNode }) {
  const [delegate, setDelegate] = useState<Delegate | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("portal_delegate");
    const token = localStorage.getItem("portal_token");
    if (raw && token) {
      try { setDelegate(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);
  const logout = () => { localStorage.removeItem("portal_token"); localStorage.removeItem("portal_delegate"); window.location.href = "/portal/login"; };
  return <Ctx.Provider value={{ delegate, logout }}>{children}</Ctx.Provider>;
}

export const usePortal = () => useContext(Ctx);

export function PortalGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("portal_token");
  if (!token) return <Navigate to="/portal/login" replace />;
  return <>{children}</>;
}

export function portalFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("portal_token") || "";
  return fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers as Record<string, string> || {}) },
  }).then(async r => {
    if (r.status === 401) { localStorage.removeItem("portal_token"); localStorage.removeItem("portal_delegate"); window.location.href = "/portal/login"; throw new Error("Unauthorized"); }
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Request failed");
    return data;
  });
}
