import { useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err, Empty } from "../components/UI";

export function Delegates() {
  const { data, loading, err, reload } = useFetch<any[]>("/api/delegates");
  const gq = useFetch<any[]>("/api/groups");
  const cq = useFetch<any[]>("/api/committees");
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const [reg, setReg] = useState("");
  const [grp, setGrp] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  if (loading || gq.loading || cq.loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const groupName = (id: unknown) => (gq.data || []).find((g) => g.id === id)?.name || "";
  const comName = (id: unknown) => (cq.data || []).find((c) => c.id === id)?.name || "";
  const rows = (data || []).filter((r) =>
    (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) &&
    (!pay || r.pay_status === pay) && (!reg || r.reg_status === reg) &&
    (!grp || String(r.group_id || "") === grp));
  return (
    <div>
      <h2>Delegates CRM</h2>
      <div className="glass">
        <div className="row">
          <input placeholder="Search name, institution, country…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
          <select value={pay} onChange={(e) => setPay(e.target.value)} style={{ maxWidth: 150 }}>
            <option value="">payment: all</option><option value="paid">paid</option><option value="unpaid">unpaid</option><option value="partial">partial</option>
          </select>
          <select value={reg} onChange={(e) => setReg(e.target.value)} style={{ maxWidth: 170 }}>
            <option value="">registration: all</option><option value="started">started</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
          </select>
          <select value={grp} onChange={(e) => setGrp(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">group: all</option>
            {(gq.data || []).map((g) => <option key={String(g.id)} value={String(g.id)}>{String(g.name).replace(/^\[DEMO\] /, "")}</option>)}
          </select>
          <span className="muted">{rows.length} records</span>
          <a className="btn ghost" href="/api/delegates/export" onClick={(e) => {
            e.preventDefault();
            fetch("/api/delegates/export", { headers: api.token ? { Authorization: `Bearer ${api.token}` } : {} })
              .then((r) => r.blob()).then((b) => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(b); a.download = "delegates.csv"; a.click();
              }).catch((ex) => toast(String(ex)));
          }}>⬇ Export CSV</a>
          <label className="btn ghost" style={{ cursor: "pointer" }}>⬆ Import CSV
            <input type="file" accept=".csv" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("f", f);
              try {
                const r = await fetch("/api/delegates/import", { method: "POST", headers: api.token ? { Authorization: `Bearer ${api.token}` } : {}, body: fd });
                if (!r.ok) throw new Error(await r.text());
                const j = await r.json();
                toast(`Imported ${j.imported}, failed ${j.failed}`);
                reload();
              } catch (ex) { toast(String(ex)); }
              e.target.value = "";
            }} />
          </label>
        </div>
        <div className="row mt">
          {(["name", "institution", "email", "country"] as const).map((k) => (
            <input key={k} placeholder={k} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ maxWidth: 150 }} />
          ))}
          <select value={form.group_id || ""} onChange={(e) => setForm({ ...form, group_id: e.target.value })} style={{ maxWidth: 170 }}>
            <option value="">no group (walk-in)</option>
            {(gq.data || []).map((g) => <option key={String(g.id)} value={String(g.id)}>{String(g.name).replace(/^\[DEMO\] /, "")}</option>)}
          </select>
          <button className="btn" onClick={async () => {
            if (!form.name) return toast("Name required");
            await api.post("/api/delegates", { ...form, group_id: form.group_id ? Number(form.group_id) : null });
            setForm({}); reload(); toast("Delegate added");
          }}>+ Add</button>
        </div>
        {!rows.length ? <div className="mt"><Empty t="import a CSV or add the first delegate" /></div> : (
          <div style={{ overflowX: "auto" }} className="mt">
            <table>
              <thead><tr><th>Name</th><th>Institution</th><th>Group</th><th>Committee</th><th>Country</th><th>Reg</th><th>Pay</th><th>Paid</th><th>Att.</th><th>Badge</th><th /></tr></thead>
              <tbody>{rows.slice(0, 150).map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td><td>{r.institution}</td><td>{groupName(r.group_id) || "—"}</td><td>{comName(r.committee_id) || "—"}</td><td>{r.country}</td>
                  <td><span className="pill">{r.reg_status}</span></td>
                  <td>
                    <select value={r.pay_status} onChange={async (e) => { await api.put(`/api/delegates/${r.id}`, { pay_status: e.target.value }); reload(); }}>
                      <option value="unpaid">unpaid</option><option value="partial">partial</option><option value="paid">paid</option>
                    </select>
                    {r.pay_status !== "paid" && (
                      <button className="btn ghost" style={{ marginLeft: 4, fontSize: 11, padding: "2px 6px" }}
                        onClick={async () => { await api.post(`/api/delegates/${r.id}/approve-payment`, {}); reload(); toast(`Payment approved for ${r.name}`); }}>
                        ✓ Approve
                      </button>
                    )}
                  </td>
                  <td>{r.amount_paid}</td>
                  <td><input type="checkbox" checked={!!r.attendance} onChange={async (e) => { await api.put(`/api/delegates/${r.id}`, { attendance: e.target.checked }); reload(); }} /></td>
                  <td><BadgeBtn key={r.id} r={r} reload={reload} /></td>
                  <td><button className="btn ghost" onClick={async () => { if (confirm("Delete?")) { await api.del(`/api/delegates/${r.id}`); reload(); } }}>✕</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BadgeBtn({ r, reload }: { r: any; reload: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <span>
      <button className="btn ghost" onClick={async () => {
        if (!r.badge_url) {
          const b = await api.post(`/api/delegates/${r.id}/badge`, {});
          toast(`Badge code ${b.code}`);
          reload();
        }
        setShow(!show);
      }}>{r.badge_url ? "🎫" : "Generate"}</button>
      {show && r.badge_url && (
        <span style={{ display: "inline-block", marginLeft: 8, background: "#fff", padding: 6, borderRadius: 8 }}>
          <img src={r.badge_url} alt="badge QR" width={110} />
          <div style={{ color: "#000", fontSize: 11, textAlign: "center" }}>{r.checkin_code}</div>
        </span>
      )}
    </span>
  );
}
