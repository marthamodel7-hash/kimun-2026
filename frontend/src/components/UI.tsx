import { useEffect, useState } from "react";
import { api, toast } from "../api";

export function useFetch<T>(path: string, deps: unknown[] = []): { data: T | null; loading: boolean; err: string; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    // Only show the skeleton on first load — background refetches must NOT
    // unmount the list (that would wipe open sections, inputs, tabs, etc).
    if (data === null) setLoading(true);
    api.get(path).then((d) => { if (live) { setData(d); setErr(""); } }).catch((e) => { if (live) setErr(String(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, n, ...deps]);
  return { data, loading, err, reload: () => setN((x) => x + 1) };
}

export function Loading() { return <div className="glass"><div className="skel" /><div className="skel mt" /></div>; }
export function Err({ e, retry }: { e: string; retry?: () => void }) {
  return <div className="glass">⚠ {e} {retry && <button className="btn ghost" onClick={retry}>Retry</button>}</div>;
}
export function Empty({ t }: { t: string }) { return <div className="glass muted">Nothing here yet — {t}.</div>; }

export function UploadButton({ onUrl, label }: { onUrl: (url: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="btn ghost" style={{ cursor: "pointer" }}>
      {busy ? "Uploading…" : label}
      <input type="file" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append("f", f);
          const r = await fetch("/api/uploads", { method: "POST", headers: api.token ? { Authorization: `Bearer ${api.token}` } : {}, body: fd });
          if (!r.ok) throw new Error(await r.text());
          onUrl((await r.json()).url);
          toast("File uploaded");
        } catch (err) { toast(String(err)); }
        finally { setBusy(false); e.target.value = ""; }
      }} />
    </label>
  );
}

export function Crud({ title, path, fields, hint }: { title: string; path: string; fields: string[]; hint?: string }) {
  const { data, loading, err, reload } = useFetch<Record<string, unknown>[]>(`/api/${path}`);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const rows = (data || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const save = async () => {
    try { await api.post(`/api/${path}`, form); setForm({}); reload(); toast(`${title} created`); }
    catch (e) { toast(String(e)); }
  };
  return (
    <div>
      <h2 style={{ margin: "4px 0 12px" }}>{title}</h2>
      {hint && <div className="muted" style={{ marginBottom: 10 }}>{hint}</div>}
      <div className="glass">
        <div className="row">
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
          <span className="muted">{rows.length} records</span>
        </div>
        <div className="row mt">
          {fields.slice(0, 4).map((f) => (
            <input key={f} placeholder={f} value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} style={{ maxWidth: 200 }} />
          ))}
          <button className="btn" onClick={save}>+ Add</button>
        </div>
        {!rows.length ? <div className="mt"><Empty t="add the first record above" /></div> : (
          <div style={{ overflowX: "auto" }} className="mt">
            <table>
              <thead><tr>{["id", ...fields.slice(0, 6)].map((f) => <th key={f}>{f}</th>)}<th /></tr></thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={String(r.id)}>
                    <td>{String(r.id)}</td>
                    {fields.slice(0, 6).map((f) => <td key={f}>{String(r[f] ?? "")}</td>)}
                    <td><button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/${path}/${r.id}`); reload(); } }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
