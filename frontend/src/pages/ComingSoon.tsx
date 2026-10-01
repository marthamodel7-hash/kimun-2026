import { useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════════
   Public gate — rendered for every feature that is closed to the
   public until the date-drop. Only the Team Member Application
   ( /apply ) is open right now.

   Never invent a date, venue, fee or committee here. If a value
   does not exist in CONFERENCE-FACTS.md it does not go on this
   screen — change the wording, not the fact.
   ═══════════════════════════════════════════════════════════════ */

const C = {
  bg: "#020305",
  text: "#e8f0f8",
  dim: "rgba(232,240,248,0.5)",
  gold: "#C9A24B",
  goldBright: "#D9B56A",
  hair: "rgba(196,165,90,0.14)",
};

const DISPLAY = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const UI = "'Inter', system-ui, sans-serif";

export default function ComingSoon() {
  const nav = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: UI,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ground wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1100px 620px at 72% 28%, rgba(20,34,64,0.85), transparent 62%)," +
            "radial-gradient(760px 520px at 18% 78%, rgba(10,18,36,0.7), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: 640, width: "100%", textAlign: "left" }}>
        {/* corner ticks — the field frame */}
        {[
          { top: -18, left: -18 },
          { top: -18, right: -18 },
          { bottom: -18, left: -18 },
          { bottom: -18, right: -18 },
        ].map((pos, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              width: 22,
              height: 22,
              borderTop: i < 2 ? `1px solid ${C.hair}` : undefined,
              borderBottom: i >= 2 ? `1px solid ${C.hair}` : undefined,
              borderLeft: i % 2 === 0 ? `1px solid ${C.hair}` : undefined,
              borderRight: i % 2 === 1 ? `1px solid ${C.hair}` : undefined,
              ...pos,
            }}
          />
        ))}

        <div
          style={{
            fontSize: 10,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: C.gold,
            marginBottom: 26,
          }}
        >
          KIMUN 2026 · Karachi, Pakistan
        </div>

        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: "clamp(48px, 12vw, 88px)",
            lineHeight: 0.98,
            letterSpacing: 1,
            margin: 0,
            background: `linear-gradient(160deg, ${C.goldBright}, ${C.gold} 52%, rgba(201,162,75,0.65))`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          OPENS
          <br />
          SOON
        </h1>

        {/* tick rule */}
        <div
          style={{
            height: 18,
            margin: "30px 0 26px",
            display: "flex",
            alignItems: "flex-end",
            gap: 9,
            opacity: 0.65,
          }}
        >
          {Array.from({ length: 46 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 1,
                height: i % 4 === 0 ? 18 : 9,
                background: C.hair,
                flex: "0 0 auto",
              }}
            />
          ))}
        </div>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.75,
            color: C.dim,
            margin: "0 0 8px",
            maxWidth: 480,
          }}
        >
          Delegate registration opens with the date drop. Nothing opens before its
          notice — no dates, venue or fees are published until they are real.
        </p>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.75,
            color: C.dim,
            margin: "0 0 34px",
            maxWidth: 480,
          }}
        >
          The only thing open right now is the team — applications are live.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            onClick={() => nav("/apply")}
            style={{
              fontFamily: UI,
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 600,
              color: C.bg,
              background: `linear-gradient(135deg, ${C.goldBright}, ${C.gold})`,
              border: "none",
              borderRadius: 999,
              padding: "15px 30px",
              cursor: "pointer",
            }}
          >
            Apply to the team →
          </button>

          <button
            onClick={() => nav("/")}
            style={{
              fontFamily: UI,
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: C.text,
              background: "transparent",
              border: `1px solid ${C.hair}`,
              borderRadius: 999,
              padding: "15px 30px",
              cursor: "pointer",
            }}
          >
            Back home
          </button>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 9,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(232,240,248,0.32)",
          }}
        >
          Karachi Indus Model United Nations
        </div>
      </div>
    </div>
  );
}
