import { useFetch, Loading, Err } from "../components/UI";

export function Report() {
  const { data, loading, err, reload } = useFetch<any>("/api/reports/event-summary");
  if (loading) return <Loading />;
  if (err) return <Err e={err} retry={reload} />;
  const r = data;
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>KIMUN Event Report</h2>
          <div className="muted">Consolidated from live records — generated just now, no cached or fabricated figures.</div>
        </div>
        <button className="btn" onClick={() => window.print()}>🖨 Print / PDF</button>
      </div>
      <div className="grid mt" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <Section title="Delegates">
          <KV l="Total" v={r.delegates.total} /><KV l="Paid conversion" v={r.delegates.conversion_pct + "%"} />
          <KV l="Attendance" v={`${r.delegates.attendance} (${r.delegates.attendance_pct}%)`} />
          <KV l="Accommodation / Transport" v={`${r.delegates.accommodation} / ${r.delegates.transport}`} />
          <Bars obj={r.delegates.by_registration} />
        </Section>
        <Section title="Sponsors & ROI">
          <KV l="Sponsors" v={r.sponsors.count} /><KV l="Committed" v={"Rs. " + num(r.sponsors.committed)} />
          <KV l="Received" v={"Rs. " + num(r.sponsors.received)} /><KV l="Outstanding" v={"Rs. " + num(r.sponsors.outstanding)} />
          <KV l="Deliverables" v={`${r.sponsors.deliverables_done}/${r.sponsors.deliverables_total}`} />
          <Bars obj={r.sponsors.by_stage} />
        </Section>
        <Section title="Budget performance">
          <KV l="Revenue (proj → actual)" v={`${num(r.finance.revenue_projected)} → ${num(r.finance.revenue_actual)}`} />
          <KV l="Expenses (proj → actual)" v={`${num(r.finance.expenses_projected)} → ${num(r.finance.expenses_actual)}`} />
          <KV l="Profit (proj → actual)" v={`${num(r.finance.profit_projected)} → ${num(r.finance.profit_actual)}`} />
          <KV l="Receivable / Payable" v={`${num(r.finance.outstanding_receivable)} / ${num(r.finance.outstanding_payable)}`} />
        </Section>
        <Section title="Operations">
          <KV l="Tasks completed" v={`${r.tasks.completed_pct}% (${r.tasks.total})`} />
          <KV l="Venue checklist" v={`${r.logistics.venue_done}/${r.logistics.venue_total}`} />
          <KV l="Procurement delivered" v={`${r.logistics.procurement_delivered}/${r.logistics.procurement_total}`} />
          <KV l="Open risks / incidents" v={`${r.logistics.open_risks} / ${r.logistics.open_incidents}`} />
          <KV l="Team members" v={r.team.members} />
          <KV l="Overall readiness" v={r.readiness.overall + "%"} />
        </Section>
        <Section title="Media & marketing" wide>
          <KV l="Content items / campaigns" v={`${r.media.content_total} / ${r.media.campaigns}`} />
          <KV l="Total reach / engagement" v={`${num(r.media.total_reach)} / ${num(r.media.total_engagement)}`} />
          <Bars obj={r.media.by_status} /><Bars obj={r.media.by_platform} />
          {r.media.top_content.map((c: any, i: number) => (
            <div key={i} className="row mt" style={{ justifyContent: "space-between", fontSize: 14 }}>
              <span>#{i + 1} {c.title} <span className="muted">({c.platform})</span></span>
              <span className="muted">reach {c.reach} · eng {c.engagement}</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <div className="glass" style={wide ? { gridColumn: "1/-1" } : {}}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>;
}
function KV({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="row" style={{ justifyContent: "space-between", margin: "5px 0", fontSize: 14 }}><span className="muted">{l}</span><b>{v}</b></div>;
}
function Bars({ obj }: { obj: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(obj));
  return <div className="mt">{Object.entries(obj).map(([k, v]) => (
    <div key={k} className="row" style={{ gap: 8, margin: "4px 0", fontSize: 13 }}>
      <span style={{ width: 110 }}>{k}</span>
      <div className="bar" style={{ flex: 1 }}><div style={{ width: `${(v / max) * 100}%` }} /></div>
      <b>{v}</b>
    </div>
  ))}</div>;
}
function num(n: number) { return Number(n || 0).toLocaleString(); }
