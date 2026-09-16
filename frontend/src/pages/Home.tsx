/**
 * Home — KIMUN 2026 cinematic landing page.
 * Film grain, scroll reveals, counter animation, vignette,
 * entrance animation, gold shimmer, parallax, hero CTA, mission hover, dividers.
 * Full mobile/tablet responsive.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import UNLogo3D from "../components/home/UNLogo3D";

/* ── Palette ── */
const C = {
  bg:     "#020305",
  surface: "#080c14",
  text:   "#e8f0f8",
  muted:  "#8a8070",
  dim:    "#5a5048",
  gold:   "#c4a55a",
  goldLt: "#d4bc7a",
  goldDk: "#a08840",
  sage:   "#6b8070",
  white:  "#f0f4f8",
};

/* ── Media query hook ── */
function useMQ() {
  const [bp, setBp] = useState<"sm" | "md" | "lg">("lg");
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 640) setBp("sm");
      else if (w < 1024) setBp("md");
      else setBp("lg");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

const NAV = ["Home", "About", "Conference", "Committees", "Our Team", "Contact"];

const CARDS = [
  { to: "/register",     icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    label: "Register as Delegate", desc: "Join as a delegate or delegation of up to six" },
  { to: "/apply",        icon: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6",
    label: "Apply as Volunteer", desc: "Join the operations committee" },
  { to: "/portal/login", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
    label: "Delegate Portal", desc: "Access your portal with reference number" },
  { to: "/team/login",   icon: "M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zM20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 3.13a4 4 0 010 7.75M12 14v3",
    label: "Team Portal", desc: "Department operations — reference number access" },
  { to: "/login",        icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18",
    label: "Staff Login", desc: "Internal operations center access" },
];

const STATS = [
  { n: 500, suffix: "+", l: "Delegates", s: "From across the region and beyond" },
  { n: 8,   suffix: "+", l: "Committees", s: "Tackling global challenges" },
  { n: 3,   suffix: "",  l: "Days", s: "Of debate, diplomacy and impact" },
  { n: 1,   suffix: "",  l: "Vision", s: "A more united tomorrow" },
];

/* ────────────────────────────────────────────
   CSS — keyframes + responsive media queries
   ──────────────────────────────────────────── */
const globalCSS = `
@keyframes goldShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Hamburger menu open state */
.kimun-hamburger:checked ~ .kimun-mobile-nav {
  max-height: 400px;
  opacity: 1;
  padding: 8px 0;
}
.kimun-hamburger:checked ~ .kimun-hamburger-label .kimun-hamburger-line:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}
.kimun-hamburger:checked ~ .kimun-hamburger-label .kimun-hamburger-line:nth-child(2) {
  opacity: 0;
}
.kimun-hamburger:checked ~ .kimun-hamburger-label .kimun-hamburger-line:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}
`;

/* ═══════════════════════════════════════════════
   1. PAGE ENTRANCE ANIMATION — black curtain
   ═══════════════════════════════════════════════ */
function EntranceCurtain() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: C.bg, pointerEvents: "none",
      }}
    />
  );
}

/* ── Animated counter ── */
function AnimatedStat({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Glass card with hover arrow ── */
function GlassCard({ to, icon, label, desc }: typeof CARDS[number]) {
  const nav = useNavigate();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }, []);

  return (
    <button
      ref={ref}
      onClick={() => nav(to)}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", overflow: "hidden",
        padding: "28px 24px 24px",
        background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 50%, rgba(196,165,90,0.02) 100%)",
        border: "1px solid rgba(196,165,90,0.12)",
        borderRadius: 22, cursor: "pointer", textAlign: "left", color: C.text,
        fontFamily: "Inter, sans-serif",
        backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)",
        transition: "border-color 0.4s, transform 0.4s, box-shadow 0.5s",
        display: "flex", flexDirection: "column", gap: 14, minHeight: 170,
        width: "100%",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3)",
        borderColor: hover ? "rgba(196,165,90,0.3)" : "rgba(196,165,90,0.12)",
        transform: hover ? "translateY(-5px)" : "translateY(0)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.25), transparent)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0,
        background: `radial-gradient(circle 200px at ${pos.x}% ${pos.y}%, rgba(196,165,90,0.07), transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(196,165,90,0.06)",
        border: "1px solid rgba(196,165,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: 0.2, position: "relative" }}>{label}</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, position: "relative" }}>{desc}</div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: hover ? 12 : 8, position: "relative", transition: "gap 0.3s" }}>
        <span style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600 }}>Explore</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hover ? "translateX(4px)" : "translateX(0)", transition: "transform 0.3s" }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

/* ── Scroll-reveal wrapper ── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
      >{children}</motion.div>
    </div>
  );
}

/* ── Film grain overlay ── */
function FilmGrain() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, opacity: 0.035, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}

/* ── Page vignette ── */
function Vignette() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)" }} />
  );
}

/* ── Section divider ── */
function SectionDivider({ px }: { px: number }) {
  return (
    <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: `0 ${px}px` }}>
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.12) 30%, rgba(196,165,90,0.06) 70%, transparent)" }} />
    </div>
  );
}

/* ── Stat block ── */
function StatBlock({ n, suffix, l, s, compact }: typeof STATS[number] & { compact?: boolean }) {
  return (
    <div style={{ padding: compact ? "14px 0" : "20px 0", borderBottom: "1px solid rgba(196,165,90,0.05)" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: compact ? 36 : 48, fontWeight: 300, color: C.text, lineHeight: 1, marginBottom: 4 }}>
        <AnimatedStat target={n} suffix={suffix} />
      </div>
      <div style={{ fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 3 }}>{l}</div>
      <div style={{ fontSize: compact ? 12 : 13, color: C.dim, lineHeight: 1.5 }}>{s}</div>
    </div>
  );
}

/* ── Mission card with hover ── */
function MissionCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "24px 20px",
        background: hover ? "rgba(196,165,90,0.04)" : "rgba(196,165,90,0.02)",
        border: `1px solid ${hover ? "rgba(196,165,90,0.15)" : "rgba(196,165,90,0.05)"}`,
        borderRadius: 18, textAlign: "center",
        transition: "all 0.4s ease",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 12px 32px rgba(0,0,0,0.3), 0 0 20px rgba(196,165,90,0.04)" : "none",
      }}
    >
      <div style={{
        width: 42, height: 42, margin: "0 auto 12px", borderRadius: "50%",
        background: hover ? "rgba(196,165,90,0.12)" : "rgba(196,165,90,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.4s",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={C.gold} opacity={hover ? 0.9 : 0.6} style={{ transition: "opacity 0.4s" }}><path d={icon} /></svg>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: hover ? C.goldLt : C.text, marginBottom: 5, transition: "color 0.3s" }}>{title}</div>
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════ */
export default function Home() {
  const nav = useNavigate();
  const bp = useMQ();
  const isMobile = bp === "sm";
  const isTablet = bp === "md";

  /* Parallax — reduced on mobile for perf */
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 800], [0, isMobile ? -40 : -120]);
  const globeY = useTransform(scrollY, [0, 800], [0, isMobile ? -60 : -200]);
  const cardsY = useTransform(scrollY, [0, 800], [0, isMobile ? -20 : -60]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  /* Responsive values */
  const px = isMobile ? 20 : isTablet ? 40 : 60;
  const sectionPx = isMobile ? 16 : isTablet ? 32 : 60;

  const logoSize = isMobile ? 100 : isTablet ? 140 : 180;
  const titleSize = isMobile ? 52 : isTablet ? 68 : 82;
  const yearSize = isMobile ? 46 : isTablet ? 60 : 72;
  const globeSize = isMobile ? 260 : isTablet ? 340 : 420;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      <EntranceCurtain />
      <FilmGrain />
      <Vignette />

      {/* Inject CSS */}
      <style>{globalCSS}</style>

      {/* ═══ ATMOSPHERIC BACKGROUND ═══ */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-12%", left: "-8%", width: "50%", height: "50%", background: "radial-gradient(ellipse at center, rgba(196,165,90,0.04) 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", top: "20%", left: "30%", width: "40%", height: "40%", background: "radial-gradient(ellipse at center, rgba(160,136,64,0.025) 0%, transparent 65%)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", top: "10%", right: "0%", width: "35%", height: "40%", background: "radial-gradient(ellipse at center, rgba(212,188,122,0.02) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      {/* ═══ HEADER ═══ */}
      <motion.header
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: `0 ${isMobile ? 16 : 48}px`, height: isMobile ? 56 : 64,
          background: "rgba(2,3,5,0.6)", backdropFilter: "blur(20px) saturate(120%)", WebkitBackdropFilter: "blur(20px) saturate(120%)",
        }}
      >
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.12) 30%, rgba(196,165,90,0.08) 70%, transparent)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 101 }}>
          <img src="/kimun-logo.png" alt="KIMUN" style={{ height: isMobile ? 32 : 40, width: isMobile ? 32 : 40, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.gold, letterSpacing: 2.5 }}>KIMUN</div>
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: "flex", gap: isTablet ? 20 : 32, alignItems: "center" }}>
            {NAV.map((item, i) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                style={{ fontSize: 10, letterSpacing: isTablet ? 3 : 4, textTransform: "uppercase" as const, color: i === 0 ? C.text : C.dim, textDecoration: "none", fontWeight: i === 0 ? 500 : 400, transition: "color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.color = C.goldLt; }}
                onMouseLeave={e => { if (i !== 0) e.currentTarget.style.color = C.dim; }}
              >{item}</a>
            ))}
          </nav>
        )}

        {/* Desktop register button */}
        {!isMobile && (
          <button onClick={() => nav("/register")} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 18px",
            background: "rgba(196,165,90,0.08)", border: "1px solid rgba(196,165,90,0.15)",
            borderRadius: 99, cursor: "pointer", fontSize: 10, letterSpacing: 3,
            textTransform: "uppercase" as const, color: C.goldLt, fontWeight: 500, transition: "all 0.3s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.3)"; e.currentTarget.style.background = "rgba(196,165,90,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.15)"; e.currentTarget.style.background = "rgba(196,165,90,0.08)"; }}
          >
            Register
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <>
            <input type="checkbox" id="kimun-hamburger" className="kimun-hamburger" style={{ display: "none" }} />
            <label htmlFor="kimun-hamburger" className="kimun-hamburger-label" style={{
              display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", zIndex: 101, padding: 4,
            }}>
              <span className="kimun-hamburger-line" style={{ display: "block", width: 20, height: 1.5, background: C.gold, borderRadius: 1, transition: "all 0.3s", transformOrigin: "center" }} />
              <span className="kimun-hamburger-line" style={{ display: "block", width: 20, height: 1.5, background: C.gold, borderRadius: 1, transition: "all 0.3s" }} />
              <span className="kimun-hamburger-line" style={{ display: "block", width: 20, height: 1.5, background: C.gold, borderRadius: 1, transition: "all 0.3s", transformOrigin: "center" }} />
            </label>

            {/* Mobile dropdown nav */}
            <div className="kimun-mobile-nav" style={{
              position: "absolute", top: isMobile ? 56 : 64, left: 0, right: 0,
              background: "rgba(2,3,5,0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              borderBottom: "1px solid rgba(196,165,90,0.1)",
              maxHeight: 0, opacity: 0, overflow: "hidden",
              transition: "max-height 0.35s ease, opacity 0.3s ease, padding 0.3s ease",
              padding: "0 16px",
              display: "flex", flexDirection: "column", gap: 0,
            }}>
              {NAV.map((item, i) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => { (document.getElementById("kimun-hamburger") as HTMLInputElement).checked = false; }}
                  style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase" as const, color: i === 0 ? C.text : C.dim, textDecoration: "none", fontWeight: i === 0 ? 500 : 400, padding: "12px 0", borderBottom: i < NAV.length - 1 ? "1px solid rgba(196,165,90,0.05)" : "none", transition: "color 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.goldLt; }}
                  onMouseLeave={e => { if (i !== 0) e.currentTarget.style.color = C.dim; }}
                >{item}</a>
              ))}
              <button onClick={() => { (document.getElementById("kimun-hamburger") as HTMLInputElement).checked = false; nav("/register"); }}
                style={{
                  marginTop: 8, padding: "10px 0", background: "rgba(196,165,90,0.08)", border: "1px solid rgba(196,165,90,0.15)",
                  borderRadius: 12, cursor: "pointer", fontSize: 11, letterSpacing: 3,
                  textTransform: "uppercase" as const, color: C.goldLt, fontWeight: 500, transition: "all 0.3s", width: "100%",
                }}>
                Register Now
              </button>
              <button onClick={() => { (document.getElementById("kimun-hamburger") as HTMLInputElement).checked = false; nav("/team/login"); }}
                style={{
                  marginTop: 6, padding: "10px 0", background: "rgba(196,165,90,0.03)", border: "1px solid rgba(196,165,90,0.08)",
                  borderRadius: 12, cursor: "pointer", fontSize: 11, letterSpacing: 3,
                  textTransform: "uppercase" as const, color: C.dim, fontWeight: 500, transition: "all 0.3s", width: "100%",
                }}>
                Team Portal
              </button>
            </div>
          </>
        )}
      </motion.header>

      {/* ═══ HERO ═══ */}
      <section style={{
        position: "relative", zIndex: 2,
        minHeight: isMobile ? "auto" : "100vh",
        height: isMobile ? "auto" : "100vh",
        display: "flex", flexDirection: "column",
        padding: `${isMobile ? 72 : 80}px ${px}px ${isMobile ? 24 : 32}px`,
        gap: 0,
      }}>
        <div style={{
          flex: 1, display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "center" : "center",
          justifyContent: isMobile ? "center" : undefined,
          minHeight: isMobile ? "auto" : 0,
          gap: isMobile ? 20 : 0,
        }}>

          {/* LEFT — Typography */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: isMobile ? "none" : "0 0 44%",
              maxWidth: isMobile ? "100%" : 520,
              width: isMobile ? "100%" : undefined,
              paddingLeft: isMobile ? 0 : "2vw",
              y: titleY,
              opacity: heroOpacity,
              textAlign: isMobile ? "center" : "left",
            }}
          >
            <div style={{ fontSize: isMobile ? 9 : 10, letterSpacing: isMobile ? 3 : 5, textTransform: "uppercase" as const, color: C.dim, fontWeight: 500, marginBottom: isMobile ? 12 : 20 }}>
              Karachi Indus Model United Nations
            </div>

            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : undefined, gap: isMobile ? 16 : 24, flexDirection: isMobile ? "column" : "row" }}>
              <div style={{
                width: logoSize, height: logoSize, borderRadius: isMobile ? 16 : 20, overflow: "hidden", flexShrink: 0,
                boxShadow: "0 12px 50px rgba(196,165,90,0.18), 0 0 100px rgba(196,165,90,0.08)",
                border: "2px solid rgba(196,165,90,0.2)", background: "transparent",
              }}>
                <img src="/kimun-logo.png" alt="KIMUN Emblem" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: titleSize, fontWeight: 300,
                  lineHeight: 0.88, letterSpacing: -1,
                  background: "linear-gradient(90deg, #c4a55a 0%, #d4bc7a 30%, #f0e8d8 50%, #d4bc7a 70%, #c4a55a 100%)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "goldShimmer 4s ease-in-out 1.5s 1",
                }}>KIMUN</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: yearSize, fontWeight: 300, lineHeight: 0.92, color: C.gold }}>2026</div>
              </div>
            </div>

            <div style={{ fontSize: isMobile ? 9 : 10, letterSpacing: isMobile ? 2.5 : 4, textTransform: "uppercase" as const, color: C.dim, fontWeight: 500, marginTop: isMobile ? 12 : 20, marginBottom: isMobile ? 16 : 28 }}>
              Knowledge · Integrity · Multilateralism · Unity · Negotiation
            </div>

            <p style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.65, color: C.muted, maxWidth: isMobile ? "100%" : 430, marginBottom: isMobile ? 24 : 32, fontWeight: 400 }}>
              The premier Model United Nations conference — where future leaders
              forge diplomatic solutions to the world's most pressing challenges.
            </p>

            {/* Hero CTA */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : undefined, gap: 16, marginBottom: 12, flexWrap: isMobile ? "wrap" : undefined }}>
              <button onClick={() => nav("/register")} style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: isMobile ? "11px 28px" : "12px 32px",
                background: "rgba(196,165,90,0.1)",
                border: "1px solid rgba(196,165,90,0.25)",
                borderRadius: 99, cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontSize: isMobile ? 11 : 12, fontWeight: 600,
                letterSpacing: 2, textTransform: "uppercase" as const,
                color: C.goldLt, transition: "all 0.3s",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(196,165,90,0.18)"; e.currentTarget.style.borderColor = "rgba(196,165,90,0.4)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(196,165,90,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(196,165,90,0.1)"; e.currentTarget.style.borderColor = "rgba(196,165,90,0.25)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                Register Now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>

              <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: "none", cursor: "pointer", color: C.text }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(196,165,90,0.12)", background: "rgba(196,165,90,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </div>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase" as const, fontWeight: 500, color: C.dim, whiteSpace: "nowrap" }}>Explore</div>
              </button>
            </div>
          </motion.div>

          {/* RIGHT — UN Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: isMobile ? "none" : "0 0 56%",
              display: "flex", alignItems: "center", justifyContent: "center",
              height: isMobile ? "auto" : "65vh",
              minHeight: isMobile ? "auto" : 380,
              maxHeight: isMobile ? "none" : 520,
              y: globeY,
            }}
          >
            <div style={{ width: globeSize, height: globeSize }}><UNLogo3D /></div>
          </motion.div>
        </div>

        {/* Cards — responsive grid */}
        <motion.div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3, 1fr)" : "repeat(5, 1fr)",
          gap: isMobile ? 10 : 14,
          width: "100%", flexShrink: 0,
          paddingTop: isMobile ? 16 : 12, paddingBottom: isMobile ? 20 : 16,
          y: cardsY,
        }}>
          {CARDS.map((c, i) => (
            <motion.div key={c.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
              <GlassCard {...c} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section id="about" style={{ position: "relative", zIndex: 2, padding: `${isMobile ? 48 : 80}px ${sectionPx}px`, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1.2fr 1fr",
          gap: isMobile ? 32 : 60,
          alignItems: "start",
        }}>
          <Reveal>
            <div style={{ borderRadius: 20, overflow: "hidden", position: "relative",
              background: "rgba(196,165,90,0.02)", border: "1px solid rgba(196,165,90,0.06)",
              minHeight: isMobile ? 280 : 440, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,3,5,0.2) 0%, rgba(2,3,5,0.7) 60%, rgba(2,3,5,0.95) 100%), linear-gradient(135deg, #020305 0%, #0a1220 50%, #0c1628 100%)" }} />
              <div style={{ position: "absolute", inset: 0, opacity: 0.02, backgroundImage: "linear-gradient(rgba(196,165,90,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(196,165,90,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
              <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "32px 24px" : "48px 40px", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: isMobile ? 280 : 440 }}>
                <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 12 }}>About KIMUN</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 26 : 34, fontWeight: 400, color: C.text, lineHeight: 1.15, marginBottom: 16 }}>More Than<br />Just a Conference</div>
                <p style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.7, color: C.muted, maxWidth: 380, marginBottom: 24 }}>KIMUN is a platform for young minds to debate, collaborate and create real change. It's not just about diplomacy — it's about you.</p>
                <button onClick={() => nav("/register")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, padding: 0, transition: "gap 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.gap = "12px"; }}
                  onMouseLeave={e => { e.currentTarget.style.gap = "8px"; }}
                >
                  Learn More
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              {STATS.map((s, i) => (
                <Reveal key={s.l} delay={0.1 + i * 0.1}>
                  <StatBlock {...s} compact={isMobile} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Section divider */}
      <SectionDivider px={sectionPx} />

      {/* ═══ MISSION ═══ */}
      <section style={{ position: "relative", zIndex: 2, padding: `${isMobile ? 36 : 60}px ${sectionPx}px ${isMobile ? 48 : 80}px`, maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 44 }}>
            <div style={{ fontSize: 10, letterSpacing: 5, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 12 }}>Our Mission</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 24 : 34, fontWeight: 400, color: C.text, lineHeight: 1.2 }}>
              Fostering Dialogue. Building Bridges.<br />Shaping Tomorrow.
            </div>
          </div>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 12 : 18,
        }}>
          {[
            { title: "Diplomatic Excellence", desc: "Simulating real-world multilateral negotiations to develop the next generation of global leaders.",
              icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
            { title: "Cultural Exchange", desc: "Bringing together diverse perspectives from across the region to forge understanding and cooperation.",
              icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" },
            { title: "Youth Empowerment", desc: "Providing a platform for young minds to voice ideas, challenge perspectives, and lead change.",
              icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1}>
              <MissionCard {...item} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", zIndex: 2, padding: `${isMobile ? 20 : 32}px ${sectionPx}px`, marginTop: isMobile ? 20 : 40 }}>
        <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(196,165,90,0.15) 30%, rgba(196,165,90,0.08) 70%, transparent)" }} />
        {/* Policy links */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: isMobile ? 12 : 24, marginBottom: isMobile ? 12 : 16, flexWrap: "wrap", textAlign: "center" }}>
          {[
            ["/terms", "Terms & Conditions"],
            ["/privacy", "Privacy Policy"],
            ["/equity", "Equity & Inclusion"],
          ].map(([to, label]) => (
            <a key={to} href={to} style={{ color: C.dim, fontSize: isMobile ? 9 : 10, letterSpacing: 1.5, textTransform: "uppercase" as const, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.dim)}>
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: isMobile ? 8 : 20, fontSize: isMobile ? 8 : 9, color: C.dim, letterSpacing: isMobile ? 2 : 3, textTransform: "uppercase" as const, flexWrap: "wrap", textAlign: "center" }}>
          <span style={{ color: C.gold, fontWeight: 500 }}>KIMUN 2026</span>
          <span style={{ opacity: 0.2 }}>·</span>
          <span>Karachi Indus Model United Nations</span>
          <span style={{ opacity: 0.2 }}>·</span>
          <span>Diplomacy in Action</span>
        </div>
      </footer>
    </div>
  );
}
