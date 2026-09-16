import { useState } from "react";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import LogoHero from "../components/LogoHero";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();
  return (
    <div className="login-wrap">
      <div className="glass login-card">
        <LogoHero size={100} subtitle="Operations Center" />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="mt" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        {err && <div className="mt" style={{ color: "#ff6b8a" }}>{err}</div>}
        <button className="btn mt" style={{ width: "100%" }} onClick={go}>Sign in</button>
      </div>
    </div>
  );
  async function go() {
    try { const r = await api.post("/api/auth/login", { email, password }); setToken(r.token); nav("/"); }
    catch { setErr("Invalid credentials"); }
  }
}
