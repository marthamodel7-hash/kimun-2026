/**
 * LogoHero — advertisement-style logo with the KIMUN brand palette.
 * Gold brass ring, deep navy glow, muted sage accents.
 * Matches the logo: deep navy + gold brass + sage green.
 */
import { CSSProperties } from "react";

type Props = {
  size?: number;
  showBrand?: boolean;
  subtitle?: string;
  style?: CSSProperties;
};

const KEYFRAMES = `
@keyframes kh-glow {
  0%, 100% { box-shadow:
    0 0 20px  rgba(196,165,90,0.3),
    0 0 50px  rgba(196,165,90,0.12),
    inset 0 0 14px rgba(196,165,90,0.06);
  }
  50% { box-shadow:
    0 0 32px  rgba(196,165,90,0.5),
    0 0 70px  rgba(196,165,90,0.22),
    inset 0 0 20px rgba(196,165,90,0.10);
  }
}
@keyframes kh-ring-breathe {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}
@keyframes kh-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
@keyframes kh-subtle-drift {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
`;

/* Brand palette — extracted from the KIMUN logo */
const GOLD      = "#c4a55a";
const GOLD_LT   = "#d4bc7a";
const GOLD_DK   = "#a08840";
const NAVY      = "#0a1628";
const NAVY_LT   = "#142238";
const SAGE      = "#6b8070";

export default function LogoHero({ size = 110, showBrand = true, subtitle, style }: Props) {
  const border  = Math.max(2, Math.round(size * 0.025));
  const ring    = size + 20;
  const ringW   = Math.max(2, Math.round(size * 0.018));

  return (
    <div style={{ textAlign: "center", ...style }}>
      <style>{KEYFRAMES}</style>

      {/* Logo container */}
      <div style={{
        position: "relative",
        width: ring, height: ring,
        margin: "0 auto 20px",
        animation: "kh-subtle-drift 6s ease-in-out infinite",
      }}>
        {/* Gold ring border */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `linear-gradient(160deg, ${GOLD_LT}, ${GOLD}, ${GOLD_DK}, ${GOLD})`,
          padding: ringW,
          animation: "kh-ring-breathe 4s ease-in-out infinite",
        }}>
          <div style={{
            width: "100%", height: "100%",
            borderRadius: "50%",
            background: NAVY,
          }} />
        </div>

        {/* Logo image */}
        <img
          src="/kimun-logo.png"
          alt="KIMUN"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: `${border}px solid ${NAVY}`,
            animation: "kh-glow 4s ease-in-out infinite",
            zIndex: 1,
          }}
        />

        {/* Subtle gold shimmer sweep */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: size,
          height: size,
          borderRadius: "50%",
          background: `linear-gradient(115deg, transparent 35%, rgba(196,165,90,0.12) 48%, rgba(212,188,122,0.20) 50%, rgba(196,165,90,0.12) 52%, transparent 65%)`,
          backgroundSize: "200% 100%",
          animation: "kh-shimmer 5s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 2,
        }} />
      </div>

      {/* Brand text — gold, not blue */}
      {showBrand && (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{
            fontSize: Math.round(size * 0.26),
            fontWeight: 800,
            letterSpacing: 6,
            color: GOLD,
            textShadow: `0 0 20px rgba(196,165,90,0.25), 0 2px 4px rgba(0,0,0,0.4)`,
          }}>
            KIMUN
          </div>
          <div style={{
            fontSize: Math.round(size * 0.11),
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: SAGE,
            marginTop: 2,
          }}>
            Karachi Indus Model United Nations
          </div>
          {subtitle && (
            <div style={{
              fontSize: Math.round(size * 0.10),
              fontWeight: 500,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "#4a5a6a",
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid rgba(196,165,90,0.15)`,
            }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
