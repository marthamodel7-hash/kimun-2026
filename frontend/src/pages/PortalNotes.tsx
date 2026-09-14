import { useEffect, useState } from "react";
import { portalFetch } from "../portal";

type Note = { id: number; body: string; created_at: string };

export function PortalNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [err, setErr] = useState("");

  function load() { portalFetch("/api/portal/notes").then(setNotes).catch(e => setErr(e.message)); }
  useEffect(load, []);

  async function create() {
    if (!body.trim()) return;
    setErr("");
    try {
      const n = await portalFetch("/api/portal/notes", { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      setNotes([n, ...notes]); setBody("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function update() {
    if (editId === null || !editBody.trim()) return;
    setErr("");
    try {
      const n = await portalFetch(`/api/portal/notes/${editId}`, { method: "PUT", body: JSON.stringify({ body: editBody.trim() }) });
      setNotes(notes.map(x => x.id === editId ? n : x));
      setEditId(null); setEditBody("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function remove(id: number) {
    setErr("");
    try {
      await portalFetch(`/api/portal/notes/${id}`, { method: "DELETE" });
      setNotes(notes.filter(x => x.id !== id));
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div>
      <div className="topbar"><h2 style={{ margin: 0, fontSize: 20 }}>My Notes</h2></div>

      <div className="glass" style={{ marginBottom: 16 }}>
        <textarea placeholder="Write a note..." value={body} onChange={e => setBody(e.target.value)}
          style={{ minHeight: 80, resize: "vertical" }} />
        <button className="btn mt" onClick={create} disabled={!body.trim()}>Save Note</button>
      </div>

      {err && <div style={{ color: "#ff3366", fontSize: 13, marginBottom: 10 }}>{err}</div>}

      {notes.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", color: "#6b7a90", padding: 40 }}>No notes yet.</div>
      ) : (
        notes.map(n => (
          <div key={n.id} className="glass" style={{ marginBottom: 10 }}>
            {editId === n.id ? (
              <div>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} style={{ minHeight: 60 }} />
                <div className="row mt">
                  <button className="btn" onClick={update}>Save</button>
                  <button className="btn ghost" onClick={() => { setEditId(null); setEditBody(""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{n.body}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#6b7a90" }}>{n.created_at?.slice(0, 16)}</span>
                  <div className="row">
                    <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => { setEditId(n.id); setEditBody(n.body); }}>Edit</button>
                    <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px", color: "#ff3366" }} onClick={() => remove(n.id)}>Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
