import { useState, Fragment } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err, UploadButton } from "../components/UI";

export function Media() {
  const [tab, setTab] = useState("overview");
  return (
    <div>
      <h2>Media Command Center</h2>
      <div className="muted">Full production lifecycle — idea → brief → copy → design → review → approval → scheduled → published → analytics. Nothing auto-publishes.</div>
      <div className="tabs">{["overview", "campaigns", "content", "ideas", "assets", "videos", "social", "ambassadors", "press", "approvals", "live", "analytics"].map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "overview" && <MediaOverview />}
      {tab === "campaigns" && <Gen path="campaigns" fields={["name", "objective", "audience", "platforms", "owner", "status"]} title="Campaigns" />}
      {tab === "content" && <ContentBoard />}
      {tab === "ideas" && <Ideas />}
      {tab === "assets" && <Assets />}
      {tab === "videos" && <Gen path="videos" fields={["title", "kind", "editor", "status", "script"]} title="Video & Reels" />}
      {tab === "social" && <Social />}
      {tab === "ambassadors" && <Gen path="ambassadors" fields={["name", "institution", "platform", "handle", "code", "registrations", "status"]} title="Ambassadors" />}
      {tab === "press" && <Gen path="press" fields={["outlet", "name", "email", "status", "notes"]} title="Press & PR" />}
      {tab === "approvals" && <Approvals />}
      {tab === "live" && <Live />}
      {tab === "analytics" && <Analytics />}
    </div>
  );
}

function Gen({ path, fields, title }: { path: string; fields: string[]; title: string }) {
  const { data, loading, err, reload } = useFetch<any[]>(`/api/${path}`);
  const [f, setF] = useState<Record<string, string>>({});
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  return (
    <div className="glass">
      <h3>{title} ({(data || []).length})</h3>
      <div className="row">{fields.slice(0, 3).map((k) => <input key={k} placeholder={k} value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ maxWidth: 200 }} />)}
        <button className="btn" onClick={async () => { await api.post(`/api/${path}`, f); setF({}); reload(); toast("Created"); }}>+ Add</button>
        {path === "assets" && <UploadButton label="⬆ Upload file as asset" onUrl={async (url) => { await api.post("/api/assets", { name: url.split("/").pop(), kind: "file", url }); reload(); }} />}</div>
      <table className="mt"><thead><tr>{fields.slice(0, 6).map((k) => <th key={k}>{k}</th>)}<th /></tr></thead>
        <tbody>{(data || []).slice(0, 80).map((r) => <tr key={r.id}>{fields.slice(0, 6).map((k) => <td key={k}>{String(r[k] ?? "")}</td>)}
          <td><button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/${path}/${r.id}`); reload(); } }}>✕</button></td></tr>)}</tbody></table>
    </div>
  );
}

function MediaOverview() {
  const { data: c } = useFetch<any[]>("/api/content");
  const { data: camp } = useFetch<any[]>("/api/campaigns");
  const items = c || [];
  const pending = items.filter((x) => x.approval === "awaiting_review").length;
  const pub = items.filter((x) => x.status === "published").length;
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
      {[["Content items", items.length], ["Published", pub], ["Pending approval", pending], ["Campaigns", (camp || []).length]].map(([l, v]) => (
        <div className="glass kpi" key={String(l)}><div className="l">{l}</div><div className="v">{v}</div></div>
      ))}
      <div className="glass" style={{ gridColumn: "1/-1" }}>
        <b>Content readiness</b>
        <div className="bar mt"><div style={{ width: (items.length ? Math.round((pub / items.length) * 100) : 0) + "%" }} /></div>
        <div className="muted mt">Missing copy, designs, approvals and unscheduled items surface here from live records.</div>
      </div>
    </div>
  );
}

const CSTAGES = ["idea", "brief", "copy", "design", "review", "approval", "scheduled", "published", "analytics"];
function ContentBoard() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/content");
  const [title, setTitle] = useState("");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  return (
    <div>
      <div className="glass row"><input placeholder="New content title…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: 300 }} />
        <button className="btn" onClick={async () => { if (!title) return; await api.post("/api/content", { title, status: "idea" }); setTitle(""); reload(); }}>+ Add</button></div>
      <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {CSTAGES.map((s) => (
          <div className="glass" key={s}><b>{s}</b>
            {(data || []).filter((x) => x.status === s).map((x) => (
              <div key={x.id} className="glass mt" style={{ padding: 10 }}>
                <div>{x.title}</div><div className="muted">{x.platform} · {x.content_type}</div>
                <div className="row mt">
                  <select value={x.status} onChange={async (e) => { await api.put(`/api/content/${x.id}`, { status: e.target.value }); reload(); }}>
                    {CSTAGES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button className="btn ghost" onClick={async () => { await api.put(`/api/content/${x.id}`, { approval: "approved", status: "scheduled" }); reload(); toast("Approved — scheduled, not published"); }}>Approve</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Ideas() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/ideas");
  const [title, setTitle] = useState("");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  return (
    <div className="glass">
      <div className="row"><input placeholder="New idea…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: 300 }} />
        <button className="btn" onClick={async () => { if (!title) return; await api.post("/api/ideas", { title }); setTitle(""); reload(); }}>Submit idea</button></div>
      {(data || []).map((i) => (
        <div key={i.id} className="row mt" style={{ justifyContent: "space-between" }}>
          <span>{i.title} <span className="pill">{i.votes} votes</span> <span className="muted">{i.status}</span></span>
          <span className="row">
            <button className="btn ghost" onClick={async () => { await api.post(`/api/ideas/${i.id}/vote`, {}); reload(); }}>▲ Vote</button>
            <button className="btn ghost" onClick={async () => { const r = await api.post(`/api/ideas/${i.id}/convert`, {}); reload(); toast(`Converted → content #${r.content_id}`); }}>Convert to task</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function Assets() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/assets");
  const [name, setName] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [hist, setHist] = useState<Record<number, any[]>>({});
  const [note, setNote] = useState("");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const showHist = async (id: number) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    const rows = await api.get(`/api/assets/${id}/versions`).catch(() => []);
    setHist((h) => ({ ...h, [id]: rows }));
  };
  return (
    <div className="glass">
      <h3>Asset Library ({(data || []).length})</h3>
      <div className="row">
        <input placeholder="New asset name…" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 220 }} />
        <button className="btn" onClick={async () => { if (!name) return; await api.post("/api/assets", { name }); setName(""); reload(); }}>+ Add</button>
        <UploadButton label="⬆ Upload file as asset" onUrl={async (url) => { await api.post("/api/assets", { name: url.split("/").pop(), kind: "file", url }); reload(); }} />
      </div>
      <table className="mt"><thead><tr><th>Name</th><th>Kind</th><th>Ver</th><th>Approval</th><th>History</th><th /></tr></thead>
        <tbody>{(data || []).slice(0, 80).map((r) => (
          <Fragment key={r.id}>
            <tr key={r.id}>
              <td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.name}</a> : r.name}</td>
              <td>{r.kind}</td><td><span className="pill">v{r.version}</span></td><td><span className="pill">{r.approval}</span></td>
              <td><button className="btn ghost" onClick={() => showHist(r.id)}>{open === r.id ? "Hide" : `History (${(hist[r.id] || []).length || "…"})`}</button></td>
              <td><button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/assets/${r.id}`); reload(); } }}>✕</button></td>
            </tr>
            {open === r.id && (
              <tr key={r.id + "-h"}><td colSpan={6}>
                <div className="muted" style={{ fontSize: 13 }}>V1 → V2 → … → Approved. Old versions are never destroyed; new versions re-enter review.</div>
                {(hist[r.id] || []).map((v) => (
                  <div key={v.version} className="row mt" style={{ justifyContent: "space-between", fontSize: 13 }}>
                    <span><b>v{v.version}</b> {v.url ? <a href={v.url} target="_blank" rel="noreferrer">file</a> : "(no file)"} — {v.note || "—"} <span className="muted">by {v.by}</span></span>
                  </div>
                ))}
                <div className="row mt">
                  <input placeholder="Version note e.g. new headline" value={note} onChange={(e) => setNote(e.target.value)} style={{ maxWidth: 240 }} />
                  <UploadButton label={`⬆ Upload v${(r.version || 1) + 1}`} onUrl={async (url) => {
                    const res = await api.post(`/api/assets/${r.id}/versions`, { url, note });
                    setNote(""); reload();
                    const rows = await api.get(`/api/assets/${r.id}/versions`);
                    setHist((h) => ({ ...h, [r.id]: rows }));
                    toast(`Saved v${res.version} — back to review`);
                  }} />
                </div>
              </td></tr>
            )}
          </Fragment>
        ))}</tbody></table>
    </div>
  );
}

function Social() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/social");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  return (
    <div className="glass"><h3>Social accounts</h3>
      <div className="muted">Connector-ready. Unconnected platforms show <b>Not Connected</b> — metrics are never fabricated.</div>
      <table className="mt"><thead><tr><th>Platform</th><th>Handle</th><th>Connection</th><th>Followers</th></tr></thead>
        <tbody>{(data || []).map((s) => <tr key={s.id}><td>{s.platform}</td><td>{s.handle}</td>
          <td><span className="pill">{s.connection === "not_connected" ? "Not Connected" : s.connection}</span></td><td>{s.followers}</td></tr>)}</tbody></table>
      <button className="btn ghost mt" onClick={reload}>Refresh</button>
    </div>
  );
}

function Approvals() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/content");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const q = (data || []).filter((x) => x.approval === "awaiting_review");
  return (
    <div className="glass"><h3>Approval queue ({q.length})</h3>
      {!q.length && <div className="muted">Queue clear.</div>}
      {q.map((x) => (
        <div key={x.id} className="row mt" style={{ justifyContent: "space-between" }}>
          <span>{x.title} <span className="muted">v{x.version} · {x.platform}</span></span>
          <span className="row">
            <button className="btn" onClick={async () => { await api.put(`/api/content/${x.id}`, { approval: "approved" }); reload(); }}>Approve</button>
            <button className="btn ghost" onClick={async () => { await api.put(`/api/content/${x.id}`, { approval: "changes_requested", status: "review" }); reload(); }}>Request changes</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function Live() {
  const { data: inc } = useFetch<any[]>("/api/incidents");
  const { data: c } = useFetch<any[]>("/api/content");
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      <div className="glass"><h3>🔴 Live coverage</h3><div className="muted">Mark sessions live; publishing stays manual.</div>
        {(c || []).slice(0, 8).map((x) => <div key={x.id} className="row mt" style={{ justifyContent: "space-between" }}><span>{x.title}</span><span className="pill">{x.status}</span></div>)}
      </div>
      <div className="glass"><h3>Incidents ({(inc || []).length})</h3>
        {(inc || []).map((x) => <div key={x.id} className="mt">• {x.title} <span className={`pill ${x.severity}`}>{x.severity}</span></div>)}
      </div>
    </div>
  );
}

function Analytics() {
  const { data } = useFetch<any[]>("/api/content");
  const items = (data || []).filter((x) => x.status === "published");
  const top = [...items].sort((a, b) => (b.metrics_reach || 0) - (a.metrics_reach || 0)).slice(0, 5);
  return (
    <div className="glass"><h3>Content performance (manual input until APIs connect)</h3>
      {!top.length && <div className="muted">No published content with metrics yet.</div>}
      {top.map((x) => <div key={x.id} className="row mt" style={{ justifyContent: "space-between" }}><span>{x.title}</span><span className="muted">reach {x.metrics_reach} · eng {x.metrics_engagement}</span></div>)}
    </div>
  );
}
