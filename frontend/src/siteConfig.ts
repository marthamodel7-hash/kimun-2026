/* ────────────────────────────────────────────────────────────────
   Public feature gate — single source of truth.

   The site is live, but every public feature is CLOSED except the Team
   Member Application (/apply). Delegate registration and the delegate
   portal stay shut until the date-drop.

   Flip this to `true` on launch day and everything re-opens at once:
     • the gated routes in App.tsx stop rendering the ComingSoon gate
     • the homepage registration CTAs switch back to registration
   Nothing else needs editing.
   ──────────────────────────────────────────────────────────────── */
export const delegateRegistrationOpen = false;

/* What the homepage's registration CTAs should say and where they should go
   while the gate is in this state. Kept next to the flag so a launch-day flip
   can never leave a button advertising a feature that is still closed. */
export const registerCta = delegateRegistrationOpen
  ? { to: "/register", hero: "Register Now", nav: "Register" }
  : { to: "/apply", hero: "Apply To The Team", nav: "Apply" };
