import { Link } from "react-router-dom";
import { useFetch, Loading, Err } from "../components/UI";
import { useAuth } from "../auth";

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, err, reload } = useFetch<any>("/api/dashboard/summary");
  const mineQ = useFetch<any[]>("/api/tasks/mine");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const r = data.readiness;
  const myTasks = mineQ.data || [];
  return (
    <div>
      <h1 style={{ margin: "0 0 4px" }}>KIMUN 2026 <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>· {data.conference.venue} · {data.conference.date}</span></h1>
      <div className="muted">Real-time command center — every score computed from live records, never hard-coded.</div>
      <div className="grid kpis mt">
        {[["Readiness", r.overall + "%"], ["Tasks done", `${r.counts.tasks_done}/${r.counts.tasks}`],
          ["Delegates paid", `${r.counts.paid_delegates}/${r.counts.delegates}`], ["Sponsors", r.counts.sponsors],
          ["Revenue", "Rs. " + Number(r.counts.revenue).toLocaleString()], ["Expenses", "Rs. " + Number(r.counts.expenses).toLocaleString()]
        ].map(([l, v]) => <div className="glass kpi" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>)}
      </div>
      <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="glass">
          <h3>Event readiness</h3>
          <div className="bar"><div style={{ width: r.overall + "%" }} /></div>
          <div className="mt" />
          {Object.entries(r.categories).map(([k, v]) => (
            <div key={k} className="row" style={{ justifyContent: "space-between", margin: "6px 0" }}>
              <span style={{ textTransform: "capitalize" }}>{k}</span><span className="pill">{String(v)}%</span>
            </div>
          ))}
          {r.reasons.map((x: string, i: number) => <div key={i} className="muted" style={{ marginTop: 6 }}>• {x}</div>)}
        </div>
        <div className="glass">
          <h3>Critical actions</h3>
          {!data.critical.length && <div className="muted">All clear — no overdue or blocked items.</div>}
          {data.critical.map((c: any, i: number) => (
            <div key={i} className="row" style={{ justifyContent: "space-between", margin: "8px 0" }}>
              <span><span className={`pill ${c.level}`}>{c.level}</span> {c.text}</span>
              <Link to={c.link}>Open →</Link>
            </div>
          ))}
        </div>
        {user && (
          <div className="glass">
            <h3>My deadlines</h3>
            {mineQ.loading && <div className="muted">Loading…</div>}
            {!mineQ.loading && !myTasks.length && <div className="muted">No open tasks assigned to you.</div>}
            {myTasks.slice(0, 10).map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: "space-between", margin: "6px 0" }}>
                <span>
                  {t.overdue && <span className="pill critical" style={{ marginRight: 4 }}>overdue</span>}
                  {t.due_soon && !t.overdue && <span className="pill high" style={{ marginRight: 4 }}>due soon</span>}
                  <Link to="/tasks">{t.title}</Link>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{t.due_date || "—"}</span>
              </div>
            ))}
            {myTasks.length > 10 && <div className="muted" style={{ fontSize: 12 }}>+{myTasks.length - 10} more — <Link to="/tasks">see all</Link></div>}
          </div>
        )}
      </div>
    </div>
  );
}
