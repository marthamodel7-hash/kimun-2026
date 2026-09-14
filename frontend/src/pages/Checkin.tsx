import { useEffect, useRef, useState } from "react";
import { api, toast } from "../api";
import { useFetch, Loading, Err } from "../components/UI";

export function Checkin() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<any | null>(null);
  const [err, setErr] = useState("");
  const stats = useFetch<any>("/api/checkin/today");
  const submit = async (c: string) => {
    const v = c.trim();
    if (!v) return;
    try {
      const r = await api.post("/api/checkin", { code: v });
      setRes(r); setErr("");
      stats.reload();
      toast(r.already ? `Re-scan: ${r.name} already inside` : `Welcome in, ${r.name}`);
    } catch (e) { setRes(null); setErr("Unknown badge code — check and retry."); }
  };
  return (
    <div>
      <h2>Registration check-in</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="glass">
          <h3>Scan station</h3>
          <div className="row">
            <input placeholder="Badge code e.g. K26-0001-AB12CD" value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { submit(code); setCode(""); } }} style={{ flex: 1, textTransform: "uppercase" }} />
            <button className="btn" onClick={() => { submit(code); setCode(""); }}>Check in</button>
          </div>
          <CameraScan onScan={(c) => submit(c)} />
          {err && <div className="mt" style={{ color: "#ff6b8a" }}>{err}</div>}
          {res && (
            <div className="glass mt" data-testid="checkin-result" style={{ borderColor: res.already ? "rgba(255,170,0,.5)" : "rgba(0,255,136,.5)" }}>
              <b style={{ fontSize: 18 }}>{res.already ? "↩ Re-scan" : "✅ Checked in"}</b>
              <div className="mt">{res.name}</div>
              <div className="muted">{res.institution}</div>
            </div>
          )}
        </div>
        <div className="glass">
          <h3>Today</h3>
          {stats.loading ? <Loading /> : stats.err ? <Err e={stats.err} retry={stats.reload} /> : (
            <div>
              <div className="kpi"><div className="v">{stats.data?.inside || 0} / {stats.data?.total || 0}</div><div className="l">delegates inside</div></div>
              <div className="bar mt"><div style={{ width: (stats.data?.total ? Math.round((stats.data.inside / stats.data.total) * 100) : 0) + "%" }} /></div>
              <h4 className="mt">Recent</h4>
              {(stats.data?.recent || []).map((r: any, i: number) => <div key={i} className="muted" style={{ fontSize: 13, marginTop: 4 }}>• {r.message} <span>({r.at})</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CameraScan({ onScan }: { onScan: (code: string) => void }) {
  const [on, setOn] = useState(false);
  const [supported] = useState(() => typeof (window as any).BarcodeDetector !== "undefined");
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!on) return;
    let stop = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const det = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop || !video.current) return;
          try {
            const codes = await det.detect(video.current);
            if (codes.length) { onScan(codes[0].rawValue); setOn(false); return; }
          } catch { /* keep polling */ }
          setTimeout(tick, 400);
        };
        tick();
      } catch { toast("Camera unavailable — type the code instead."); setOn(false); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [on, onScan]);
  if (!supported) return <div className="muted mt" style={{ fontSize: 13 }}>This browser has no QR scanner — type the code above (works everywhere).</div>;
  return (
    <div className="mt">
      {!on ? <button className="btn ghost" onClick={() => setOn(true)}>📷 Scan with camera</button> : (
        <div>
          <video ref={video} style={{ width: "100%", borderRadius: 12 }} muted playsInline />
          <button className="btn ghost mt" onClick={() => setOn(false)}>Stop camera</button>
        </div>
      )}
    </div>
  );
}
