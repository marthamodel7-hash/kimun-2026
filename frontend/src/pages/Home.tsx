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
import { registerCta } from "../siteConfig";

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

/* Display face — CONFERENCE-FACTS.md §Confirmed: primary display typeface = Cinzel (fallback OVO).
   Body/UI stays Inter. Cormorant Garamond is kept as the serif fallback in the stack. */
const DISPLAY = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

/* Hairline tokens — shared so every rule on the page is the same weight. */
const HAIR = "rgba(196,165,90,0.14)";
const HAIR_FAINT = "rgba(196,165,90,0.07)";

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

/* Only real in-page anchors are listed. The previous nav pointed Conference /
   Committees / Our Team / Contact at anchors that never existed, so those links
   silently did nothing. */
const NAV: { label: string; href: string }[] = [
  { label: "Home",    href: "#top" },
  { label: "About",   href: "#about" },
  { label: "Mission", href: "#mission" },
];

/* Public feature gate: only the Team Member Application is open right now.
   Cards marked `soon` route to the gate page (which tells the visitor what IS
   open) rather than into a closed feature. Set `delegateRegistrationOpen` in
   App.tsx to true on launch day and they open with it. */
type Card = { to: string; icon: string; label: string; desc: string; soon?: boolean };

const CARDS: Card[] = [
  { to: "/register",     icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    label: "Register as Delegate", desc: "Opens with the date drop", soon: true },
  { to: "/apply",        icon: "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6",
    label: "Apply as Volunteer", desc: "Open now — applications are live" },
  { to: "/portal/login", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
    label: "Delegate Portal", desc: "Opens when registration opens", soon: true },
  { to: "/team/login",   icon: "M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zM20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 3.13a4 4 0 010 7.75M12 14v3",
    label: "Team Portal", desc: "Department operations — reference number access" },
  { to: "/login",        icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18",
    label: "Staff Login", desc: "Internal operations center access" },
];

/* Only confirmed values may appear here.
   ⛔ NOT ANNOUNCED: delegate/seat counts, committee counts, dates, venue, fees.
   The old block shipped 500+ delegates / 8+ committees / 3 days — all invented.
   Change the post, not the fact.

   CONFLICT (flagged to Sir): CONFERENCE-FACTS.md still records "Registration:
   OPEN — General Body" from Sep 30, but KIMUN-AGENT-PROMPT.md (Oct 1, newer and
   locked) closes delegate registration and leaves only the Team Member
   Application open. This block follows the newer gate, otherwise the page would
   claim "registration open" 400px above a card that says "opens soon". */
type Stat = { v: number | string; l: string; s: string };

const STATS: Stat[] = [
  { v: 2026,          l: "Edition",          s: "Karachi, Pakistan" },
  { v: "OPEN",        l: "Team applications", s: "The team member form is live" },
  { v: "COMING SOON", l: "Dates & venue",    s: "Announced in sequence" },
  { v: 1,             l: "Vision",           s: "A more united tomorrow" },
];

/* ────────────────────────────────────────────
   CSS — keyframes + responsive media queries
   ──────────────────────────────────────────── */
const globalCSS = `
@keyframes goldShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Anchor targets must clear the fixed header. */
section[id], [id="top"] { scroll-margin-top: 88px; }

/* Keyboard focus is visible on the dark ground. */
a:focus-visible, button:focus-visible {
  outline: 1px solid rgba(196,165,90,0.7);
  outline-offset: 3px;
  border-radius: 4px;
}

/* Reduced motion: settle CSS-driven motion (the gold shimmer, hover and
   reveal transitions) to rest. The curtain and parallax are framer-driven. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }
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
function GlassCard({ to, icon, label, desc, soon }: Card) {
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
        width: "100%", height: "100%",
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
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: 0.2, position: "relative",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {label}
        {soon && (
          <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" as const,
            color: C.gold, border: "1px solid rgba(196,165,90,0.3)", borderRadius: 999,
            padding: "3px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
            Opens soon
          </span>
        )}
      </div>
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

/* ── Scroll-reveal wrapper.
   `fill` makes the wrapper and its motion node 100% tall so a card inside a
   stretched grid row can centre its own content. ── */
function Reveal({ children, delay = 0, fill = false }: { children: React.ReactNode; delay?: number; fill?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const h = fill ? "100%" : undefined;
  return (
    <div ref={ref} style={{ height: h }}>
      <motion.div
        style={{ height: h }}
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

/* ── Corner ticks — L-shaped hairline brackets that bound a field ── */
function CornerTicks({ arm = 20, inset = 0, color = "rgba(196,165,90,0.4)" }: { arm?: number; inset?: number; color?: string }) {
  const b = `1px solid ${color}`;
  const base: React.CSSProperties = { position: "absolute", width: arm, height: arm, pointerEvents: "none" };
  return (
    <>
      <div style={{ ...base, top: inset, left: inset, borderTop: b, borderLeft: b }} />
      <div style={{ ...base, top: inset, right: inset, borderTop: b, borderRight: b }} />
      <div style={{ ...base, bottom: inset, left: inset, borderBottom: b, borderLeft: b }} />
      <div style={{ ...base, bottom: inset, right: inset, borderBottom: b, borderRight: b }} />
    </>
  );
}

/* ── Tick rule — 1px strokes at a measured interval, alternating height.
       `space-between` lets a fixed stroke count always span the full container
       width, so the rule terminates flush with the row beneath it. ── */
function TickRule({ count = 48, height = 14, color = "rgba(196,165,90,0.22)" }: { count?: number; height?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height, width: "100%", pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ width: 1, height: i % 5 === 0 ? height : height * 0.45, background: color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

/* ── Vertical seam — the signature hairline that splits the hero unevenly ── */
function Seam({ left }: { left: string }) {
  return (
    <div aria-hidden="true" style={{
      position: "absolute", top: 72, bottom: 24, left, width: 1,
      background: "linear-gradient(180deg, transparent 0%, rgba(196,165,90,0.16) 12%, rgba(196,165,90,0.10) 88%, transparent 100%)",
      pointerEvents: "none",
    }} />
  );
}

/* ── Stat block ── */
function StatBlock({ v, l, s, compact }: Stat & { compact?: boolean }) {
  /* Numbers count up; words (OPEN / COMING SOON) are set static at a smaller
     size so a long confirmed phrase still fits the column. */
  const isNum = typeof v === "number";
  return (
    <div style={{ padding: compact ? "14px 0" : "20px 0", borderBottom: "1px solid rgba(196,165,90,0.05)" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: compact ? (isNum ? 34 : 24) : (isNum ? 46 : 30), fontWeight: 500, color: C.text, lineHeight: 1.08, marginBottom: 6, letterSpacing: isNum ? 1 : 0.5 }}>
        {isNum ? <AnimatedStat target={v} suffix="" /> : v}
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
        height: "100%",
        /* centred content: the grid stretches rows to equal height and top-aligned
           copy left an uneven void at the bottom of every card */
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 24px",
        background: hover ? "rgba(196,165,90,0.04)" : "rgba(196,165,90,0.02)",
        border: `1px solid ${hover ? "rgba(196,165,90,0.15)" : HAIR_FAINT}`,
        borderRadius: 18, textAlign: "center",
        transition: "all 0.4s ease",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 12px 32px rgba(0,0,0,0.3), 0 0 20px rgba(196,165,90,0.04)" : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* measured top rule that brightens on hover */}
      <div style={{
        position: "absolute", top: 0, left: "22%", right: "22%", height: 1,
        background: hover ? "rgba(196,165,90,0.5)" : "rgba(196,165,90,0.16)",
        transition: "background 0.4s",
      }} />
      <div style={{
        width: 44, height: 44, margin: "0 auto 14px", borderRadius: "50%",
        background: hover ? "rgba(196,165,90,0.12)" : "rgba(196,165,90,0.06)",
        border: `1px solid ${hover ? "rgba(196,165,90,0.22)" : "rgba(196,165,90,0.1)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.4s, border-color 0.4s",
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={C.gold} opacity={hover ? 0.95 : 0.65} style={{ transition: "opacity 0.4s" }}><path d={icon} /></svg>
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 500, color: hover ? C.goldLt : C.text, marginBottom: 8, transition: "color 0.3s", letterSpacing: 0.4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65, maxWidth: 300 }}>{desc}</div>
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
    <div id="top" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

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
          <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.gold, letterSpacing: 2.5 }}>KIMUN</div>
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: "flex", gap: isTablet ? 24 : 36, alignItems: "center" }}>
            {NAV.map((item, i) => (
              <a key={item.label} href={item.href}
                style={{ fontSize: 10, letterSpacing: isTablet ? 3 : 4, textTransform: "uppercase" as const, color: i === 0 ? C.text : C.dim, textDecoration: "none", fontWeight: i === 0 ? 500 : 400, transition: "color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.color = C.goldLt; }}
                onMouseLeave={e => { if (i !== 0) e.currentTarget.style.color = C.dim; }}
              >{item.label}</a>
            ))}
          </nav>
        )}

        {/* Desktop register button */}
        {!isMobile && (
          <button onClick={() => nav(registerCta.to)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 18px",
            background: "rgba(196,165,90,0.08)", border: "1px solid rgba(196,165,90,0.15)",
            borderRadius: 99, cursor: "pointer", fontSize: 10, letterSpacing: 3,
            textTransform: "uppercase" as const, color: C.goldLt, fontWeight: 500, transition: "all 0.3s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.3)"; e.currentTarget.style.background = "rgba(196,165,90,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(196,165,90,0.15)"; e.currentTarget.style.background = "rgba(196,165,90,0.08)"; }}
          >
            {registerCta.nav}
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
                <a key={item.label} href={item.href}
                  onClick={() => { (document.getElementById("kimun-hamburger") as HTMLInputElement).checked = false; }}
                  style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase" as const, color: i === 0 ? C.text : C.dim, textDecoration: "none", fontWeight: i === 0 ? 500 : 400, padding: "12px 0", borderBottom: i < NAV.length - 1 ? "1px solid rgba(196,165,90,0.05)" : "none", transition: "color 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.goldLt; }}
                  onMouseLeave={e => { if (i !== 0) e.currentTarget.style.color = C.dim; }}
                >{item.label}</a>
              ))}
              <button onClick={() => { (document.getElementById("kimun-hamburger") as HTMLInputElement).checked = false; nav(registerCta.to); }}
                style={{
                  marginTop: 8, padding: "10px 0", background: "rgba(196,165,90,0.08)", border: "1px solid rgba(196,165,90,0.15)",
                  borderRadius: 12, cursor: "pointer", fontSize: 11, letterSpacing: 3,
                  textTransform: "uppercase" as const, color: C.goldLt, fontWeight: 500, transition: "all 0.3s", width: "100%",
                }}>
                {registerCta.hero}
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
        /* min-height only: a hard 100vh clipped the card row on short laptop viewports. */
        minHeight: isMobile ? "auto" : "100vh",
        height: "auto",
        display: "flex", flexDirection: "column",
        padding: `${isMobile ? 72 : 88}px ${px}px ${isMobile ? 24 : 32}px`,
        gap: 0,
      }}>
        {/* Signature vertical seam — splits the hero unevenly, desktop/tablet only */}
        {!isMobile && <Seam left="44%" />}

        <div style={{
          flex: 1, display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "center" : "center",
          justifyContent: isMobile ? "center" : undefined,
          minHeight: isMobile ? "auto" : 0,
          gap: isMobile ? 24 : 0,
        }}>

          {/* LEFT — Typography.
              Outer node owns the scroll parallax + fade (MotionValues);
              inner node owns the entrance. Splitting them stops the two
              competing for the same `opacity` key. */}
          <motion.div
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
                  fontFamily: DISPLAY, fontSize: titleSize, fontWeight: 600,
                  lineHeight: 0.92, letterSpacing: isMobile ? 0 : 2,
                  background: "linear-gradient(90deg, #c4a55a 0%, #d4bc7a 30%, #f0e8d8 50%, #d4bc7a 70%, #c4a55a 100%)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "goldShimmer 4s ease-in-out 1.5s 1",
                }}>KIMUN</div>
                <div style={{ fontFamily: DISPLAY, fontSize: yearSize, fontWeight: 400, lineHeight: 1, letterSpacing: 4, color: C.gold }}>2026</div>
              </div>
            </div>

            {/* tracking tuned so the five values hold one line at the 44% column width */}
            <div style={{ fontSize: isMobile ? 9 : 10, letterSpacing: isMobile ? 2.5 : 2, textTransform: "uppercase" as const, color: C.dim, fontWeight: 500, marginTop: isMobile ? 12 : 20, marginBottom: isMobile ? 16 : 28, whiteSpace: isMobile ? "normal" : "nowrap" }}>
              Knowledge · Integrity · Multilateralism · Unity · Negotiation
            </div>

            <p style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.65, color: C.muted, maxWidth: isMobile ? "100%" : 430, marginBottom: isMobile ? 24 : 32, fontWeight: 400 }}>
              The premier Model United Nations conference — where future leaders
              build diplomatic solutions to the world's most pressing challenges.
            </p>

            {/* Hero CTA */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : undefined, gap: 16, marginBottom: 12, flexWrap: isMobile ? "wrap" : undefined }}>
              <button onClick={() => nav(registerCta.to)} style={{
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
                {registerCta.hero}
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
          </motion.div>

          {/* RIGHT — UN emblem, held inside a bounded field.
              The emblem is deliberately the smaller, quieter element so the
              KIMUN mark leads; the field's hairlines, corner ticks and
              annotations carry the weight of that half of the hero. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: isMobile ? "none" : "0 0 56%",
              display: "flex", alignItems: "center", justifyContent: "center",
              height: isMobile ? "auto" : "65vh",
              minHeight: isMobile ? "auto" : 380,
              maxHeight: isMobile ? "none" : 560,
              y: globeY,
            }}
          >
            <div style={{ position: "relative", width: globeSize, height: globeSize }}>
              {/* navy depth wash so the emblem sits in a field, not in a void */}
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(circle at 50% 46%, rgba(10,18,32,0.85) 0%, rgba(6,11,28,0.35) 55%, rgba(2,3,5,0) 78%)",
              }} />
              {/* hairline frame + brighter corner brackets */}
              <div style={{ position: "absolute", inset: 0, border: `1px solid ${HAIR_FAINT}` }} />
              <CornerTicks arm={18} color="rgba(196,165,90,0.42)" />

              {/* corner annotations — discovered, not read */}
              {[
                { t: "Fig. 01 · Global Field", pos: { top: 12, left: 26 }, c: C.gold },
                { t: "MUN · Simulation",       pos: { top: 12, right: 26 }, c: C.dim },
                { t: "24.86° N / 67.01° E",    pos: { bottom: 12, left: 26 }, c: C.dim },
                { t: "Karachi · PK",           pos: { bottom: 12, right: 26 }, c: C.gold },
              ].map(a => (
                <div key={a.t} style={{
                  position: "absolute", ...a.pos,
                  fontSize: isMobile ? 7 : 8, letterSpacing: isMobile ? 1.4 : 2,
                  textTransform: "uppercase" as const, color: a.c, fontWeight: 500,
                  whiteSpace: "nowrap", pointerEvents: "none", fontFamily: "Inter, sans-serif",
                }}>{a.t}</div>
              ))}

              {/* the emblem itself, inset so it never fills or breaks the frame */}
              <div style={{ position: "absolute", inset: isMobile ? 34 : 44 }}>
                <UNLogo3D />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tick rule separating the hero from the action row */}
        {!isMobile && (
          <div style={{ width: "100%", margin: `${isTablet ? 14 : 20}px 0 ${isTablet ? 10 : 14}px`, opacity: 0.9 }}>
            <TickRule count={isTablet ? 64 : 104} height={12} />
          </div>
        )}

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
              transition={{ duration: 0.6, delay: 1.0 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: "100%" }}>
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
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><CornerTicks arm={22} inset={14} color="rgba(196,165,90,0.3)" /></div>
              <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "32px 24px" : "48px 40px", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: isMobile ? 280 : 440 }}>
                <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 12 }}>About KIMUN</div>
                <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 24 : 32, fontWeight: 500, color: C.text, lineHeight: 1.25, marginBottom: 16 }}>More Than<br />Just a Conference</div>
                <p style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.7, color: C.muted, maxWidth: 380, marginBottom: 24 }}>KIMUN is a platform for young minds to debate, collaborate and create real change. It's not just about diplomacy — it's about you.</p>
                <button onClick={() => document.getElementById("mission")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, padding: 0, transition: "gap 0.3s" }}
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
      <section id="mission" style={{ position: "relative", zIndex: 2, padding: `${isMobile ? 36 : 60}px ${sectionPx}px ${isMobile ? 48 : 80}px`, maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 44 }}>
            <div style={{ fontSize: 10, letterSpacing: 5, textTransform: "uppercase" as const, color: C.gold, fontWeight: 600, marginBottom: 14 }}>Our Mission</div>
            <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 22 : 31, fontWeight: 500, color: C.text, lineHeight: 1.35, letterSpacing: 0.5 }}>
              Fostering Dialogue. Building Bridges.<br />Shaping Tomorrow.
            </div>
            {/* flanking hairlines so the heading sits on a rule rather than floating */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: isMobile ? 18 : 26 }}>
              <div style={{ width: isMobile ? 40 : 90, height: 1, background: `linear-gradient(90deg, transparent, ${HAIR})` }} />
              <div style={{ width: 4, height: 4, background: C.gold, transform: "rotate(45deg)", opacity: 0.7 }} />
              <div style={{ width: isMobile ? 40 : 90, height: 1, background: `linear-gradient(90deg, ${HAIR}, transparent)` }} />
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
            <Reveal key={item.title} delay={i * 0.1} fill>
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
