import { useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err } from "../components/UI";

type CDelegate = { id: number; name: string; institution: string; country: string; group_name: string; reg_status: string; pay_status: string };
type Committee = { id: number; name: string; room: string; capacity: number; allocation_done: boolean; pool: string[]; delegates: CDelegate[] };
type Allocation = { committees: Committee[]; unallocated: CDelegate[] };

export function AllocationPage() {
  const { data, loading, err, reload } = useFetch<Allocation>("/api/allocation");
  const [draft, setDraft] = useState<Record<number, { cid: string; country: string }>>({});
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const body = data || { committees: [], unallocated: [] };
  const assigned = body.committees.reduce((a, c) => a + c.delegates.length, 0);
  const pct = (c: Committee) => (c.capacity > 0 ? Math.round((c.delegates.length / c.capacity) * 100) : 0);
  const taken = (c: Committee) => new Set(c.delegates.map((d) => d.country).filter(Boolean));

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <h2>Country allocation</h2>
        <div className="muted">
          <b>{assigned}</b> assigned · <b>{body.unallocated.length}</b> unallocated · one country = one delegate per committee
        </div>
      </div>

      {body.unallocated.length > 0 && (
        <div className="glass mt">
          <b>Unallocated queue</b>
          <div className="muted" style={{ fontSize: 13 }}>Pick a committee and an unused country from that committee's matrix — taken options are hidden.</div>
          <div style={{ overflowX: "auto" }} className="mt">
            <table>
              <thead><tr><th>Delegate</th><th>Institution</th><th>Group</th><th>Committee</th><th>Country</th><th /></tr></thead>
              <tbody>
                {body.unallocated.map((d) => {
                  const dr = draft[d.id] || { cid: "", country: "" };
                  const c = body.committees.find((x) => String(x.id) === dr.cid);
                  const free = c ? c.pool.filter((p) => !taken(c).has(p)) : [];
                  return (
                    <tr key={d.id}>
                      <td>{d.name}</td><td>{d.institution}</td><td>{d.group_name || "—"}</td>
                      <td>
                        <select value={dr.cid} onChange={(e) => setDraft({ ...draft, [d.id]: { cid: e.target.value, country: "" } })}>
                          <option value="">— committee —</option>
                          {body.committees.map((c) => <option key={c.id} value={String(c.id)}>{c.name} ({c.delegates.length}/{c.capacity})</option>)}
                        </select>
                      </td>
                      <td>
                        {free.length > 0 ? (
                          <select value={dr.country} onChange={(e) => setDraft({ ...draft, [d.id]: { ...dr, country: e.target.value } })}>
                            <option value="">— country —</option>
                            {free.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <input placeholder={c ? "no free countries" : "country (no matrix set)"} value={dr.country}
                                 disabled={!c} onChange={(e) => setDraft({ ...draft, [d.id]: { ...dr, country: e.target.value } })} />
                        )}
                      </td>
                      <td>
                        <button className="btn" disabled={!dr.cid || !dr.country.trim()} onClick={async () => {
                          try {
                            await api.put(`/api/delegates/${d.id}/allocate`, { committee_id: Number(dr.cid), country: dr.country.trim() });
                            setDraft({ ...draft, [d.id]: { cid: "", country: "" } });
                            reload(); toast(`${d.name} → ${dr.country.trim()}`);
                          } catch (ex) { toast(String(ex)); }
                        }}>Assign</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {body.committees.map((c) => {
          const fill = pct(c);
          const takenSet = taken(c);
          const used = takenSet.size;
          return (
            <div className="glass" key={c.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{c.name}</b>
                {c.allocation_done ? <span className="pill">locked</span> : <span className="pill">{fill}% full</span>}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{c.room || "room TBD"}</div>
              <div className="meter mt" style={{ background: "#222", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(fill, 100)}%`, height: "100%", background: fill > 100 ? "#ff3366" : fill >= 90 ? "#ffaa00" : "#00ff88" }} />
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{c.delegates.length}/{c.capacity} seats · {c.pool.length} countries in matrix</div>
              <div className="row mt" style={{ flexWrap: "wrap", gap: 4 }}>
                {c.pool.map((p) => (
                  <span key={p} className={`chip ${takenSet.has(p) ? "chip-on" : ""}`} title={takenSet.has(p) ? "taken" : "free"}>
                    {p}{takenSet.has(p) ? " ✓" : ""}
                  </span>
                ))}
                {!c.pool.length && <span className="muted" style={{ fontSize: 12 }}>No matrix configured — add countries in Committees.</span>}
              </div>
              {c.delegates.length > 0 && (
                <table className="mt">
                  <thead><tr><th>Delegate</th><th>Country</th><th /></tr></thead>
                  <tbody>
                    {c.delegates.map((d) => (
                      <tr key={d.id}>
                        <td>{d.name}<div className="muted" style={{ fontSize: 11 }}>{d.group_name || d.institution}</div></td>
                        <td>{d.country}</td>
                        <td><button className="btn ghost" title="Unassign" onClick={async () => {
                          if (!confirm(`Unassign ${d.name} from ${c.name}?`)) return;
                          await api.put(`/api/delegates/${d.id}/allocate`, { committee_id: null, country: "" });
                          reload();
                        }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}