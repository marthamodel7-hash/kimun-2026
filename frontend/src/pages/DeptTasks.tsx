import { useEffect, useState } from "react";
import { deptFetch } from "../deptPortal";

type Task = { id: number; title: string; priority: string; status: string; due_date: string | null; owner_name: string; description: string };

const PRIO_COLORS: Record<string, string> = { critical: "#ff3366", high: "#ff3366", medium: "#ffaa00", low: "#00ff88" };

export function DeptTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { deptFetch("/api/apply/portal/tasks").then(setTasks).catch(e => setErr(e.message)); }, []);

  return (
    <div>
      <div className="topbar"><h2 style={{ margin: 0, fontSize: 20 }}>Department Tasks</h2></div>
      {err && <div style={{ color: "#ff3366", marginBottom: 10 }}>{err}</div>}
      {tasks.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", color: "#6b7a90", padding: 40 }}>No open tasks in your department.</div>
      ) : (
        <div className="glass">
          <table>
            <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Due</th><th>Assigned</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 12, color: "#6b7a90", marginTop: 2 }}>{t.description.slice(0, 80)}</div>}
                  </td>
                  <td><span className="pill" style={{ borderColor: PRIO_COLORS[t.priority], color: PRIO_COLORS[t.priority] }}>{t.priority}</span></td>
                  <td><span className="chip">{t.status.replace("_", " ")}</span></td>
                  <td style={{ fontSize: 12, color: t.due_date && new Date(t.due_date) < new Date() ? "#ff3366" : "#6b7a90" }}>{t.due_date || "—"}</td>
                  <td style={{ fontSize: 12 }}>{t.owner_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
