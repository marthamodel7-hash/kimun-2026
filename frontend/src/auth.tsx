import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

type User = { id: number; name: string; email: string; role: string; tier: string; tier_label: string };
const Ctx = createContext<{ user: User | null; setToken: (t: string) => void; logout: () => void }>({ user: null, setToken: () => {}, logout: () => {} });

export function AuthP({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (api.token) api.get("/api/auth/me").then(setUser).catch(() => {});
  }, []);
  return <Ctx.Provider value={{ user, setToken: (t) => { api.token = t; localStorage.setItem("kimun_token", t); api.get("/api/auth/me").then(setUser).catch(() => {}); }, logout: () => { api.token = ""; localStorage.removeItem("kimun_token"); location.href = "/login"; } }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
