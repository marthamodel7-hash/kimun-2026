import { useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err, Empty } from "../components/UI";

const STATUSES = ["prospect", "registered", "confirmed", "cancelled"];

export function Groups() {
  const gq = useFetch<Record<string, unknown>[]>("/api/groups");
  const dq = useFetch<Record<string, unknown>[]>("/api/delegates");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<Record<number, Record<string, string>>>({});
  if (gq.loading || dq.loading) return <Loading />;
  if (gq.err) return <Err e={gq.err} retry={gq.reload} />;
  const groups = gq.data || [];
  const delByGs: Record<string, number> = {};
  (dq.data || []).forEach((d) => { const k = String(d.group_id || ""); if (k) delByGs[k] = (delByGs[k] || 0) + 1; });
  const delName = (id: unknown) => { const f = (dq.data || []).find((d) => d.id === id); return f == null || f.name == null ? "" : String(f.name); };
  const rows = groups.filter((g) => !q || JSON.stringify(g).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h2>Delegations (school groups)</h2>
      <div className="glass">
        <div className="row">
          <input placeholder="Search group, contact…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
          <span className="muted">{rows.length} groups</span>
          <span className="muted">· {delByGs ? Object.values(delByGs).reduce((a, b) => a + b, 0) : 0} delegates in groups</span>
        </div>
        <div className="row mt">
          {(["name", "contact_name", "contact_email", "contact_phone"] as const).map((k) => (
            <input key={k} placeholder={k} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ maxWidth: 190 }} />
          ))}
          <select value={form.ambassador_code || ""} onChange={(e) => setForm({ ...form, ambassador_code: e.target.value })} style={{ maxWidth: 150 }}>
            <option value="">no ambassador code</option>
            <option value="AMB-KARACHI">AMB-KARACHI</option><option value="AMB-LAHORE">AMB-LAHORE</option>
          </select>
          <button className="btn" onClick={async () => {
            if (!form.name) return toast("Group name required");
            await api.post("/api/groups", form); setForm({}); gq.reload(); toast("Group added");
          }}>+ Add group</button>
        </div>
        {!rows.length ? <div className="mt"><Empty t="add the first delegation above" /></div> : (
          <div style={{ overflowX: "auto" }} className="mt">
            <table>
              <thead><tr><th>Group</th><th>Contact</th><th>Status</th><th>Members</th><th>Head delegate</th><th>Fee agreed</th><th>Amb. code</th><th /></tr></thead>
              <tbody>
                {rows.map((g) => {
                  const editing = edit[Number(g.id)] || {};
                  return (
                    <tr key={String(g.id)}>
                      {Object.keys(editing).length ? (
                        <>
                          <td><input value={editing.name || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, name: e.target.value } })} /></td>
                          <td>
                            <input placeholder="contact name" value={editing.contact_name || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, contact_name: e.target.value } })} />
                            <input placeholder="email" value={editing.contact_email || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, contact_email: e.target.value } })} />
                            <input placeholder="phone" value={editing.contact_phone || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, contact_phone: e.target.value } })} />
                          </td>
                          <td><select value={editing.status || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, status: e.target.value } })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                          <td className="muted">{delByGs[String(g.id)] || 0}</td>
                          <td>
                            <select value={editing.head_delegate_id || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, head_delegate_id: e.target.value } })}>
                              <option value="">— none —</option>
                              {(dq.data || []).map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.name)}</option>)}
                            </select>
                          </td>
                          <td><input type="number" value={editing.fee_agreed || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, fee_agreed: e.target.value } })} /></td>
                          <td><input value={editing.ambassador_code || ""} onChange={(e) => setEdit({ ...edit, [Number(g.id)]: { ...editing, ambassador_code: e.target.value } })} /></td>
                          <td className="row">
                            <button className="btn" onClick={async () => {
                              try {
                                await api.put(`/api/groups/${g.id}`, { ...editing, head_delegate_id: editing.head_delegate_id ? Number(editing.head_delegate_id) : null, fee_agreed: editing.fee_agreed === "" ? null : Number(editing.fee_agreed) });
                                setEdit({ ...edit, [Number(g.id)]: {} });
                                gq.reload(); dq.reload(); toast("Saved");
                              } catch (ex) { toast(String(ex)); }
                            }}>Save</button>
                            <button className="btn ghost" onClick={() => setEdit({ ...edit, [Number(g.id)]: {} })}>✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><b>{String(g.name)}</b></td>
                          <td className="muted" style={{ fontSize: 13 }}>{String(g.contact_name || "")}<br />{String(g.contact_email || "")}<br />{String(g.contact_phone || "")}</td>
                          <td><span className="pill">{String(g.status)}</span></td>
                          <td>{delByGs[String(g.id)] || 0}</td>
                          <td className="muted">{delName(g.head_delegate_id) || "—"}</td>
                          <td>{g.fee_agreed ? Number(g.fee_agreed).toLocaleString() : "—"}</td>
                          <td>{String(g.ambassador_code || "—")}</td>
                          <td className="row">
                            <button className="btn ghost" onClick={() => setEdit({ ...edit, [Number(g.id)]: { name: String(g.name || ""), contact_name: String(g.contact_name || ""), contact_email: String(g.contact_email || ""), contact_phone: String(g.contact_phone || ""), status: String(g.status || "registered"), head_delegate_id: String(g.head_delegate_id || ""), fee_agreed: g.fee_agreed == null ? "" : String(g.fee_agreed), ambassador_code: String(g.ambassador_code || ""), notes: String(g.notes || "") } })}>Edit</button>
                            <button className="btn ghost" onClick={async () => { if (confirm(`Delete ${g.name}? Delegates stay, they become walk-ins.`)) { await api.del(`/api/groups/${g.id}`); gq.reload(); } }}>✕</button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}