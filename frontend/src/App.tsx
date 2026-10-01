import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { AuthP } from "./auth";
import { api } from "./api";
import { Layout } from "./components/Layout";
import { PortalProvider, PortalGuard } from "./portal";
import { PortalLayout } from "./components/PortalLayout";
import { DeptPortalProvider, DeptPortalGuard, DeptPortalLayout } from "./deptPortal";
import { TeamProvider, TeamGuard, TeamPortalLayout } from "./teamPortal";
import { Dashboard } from "./pages/Dashboard";
import { Tasks } from "./pages/Tasks";
import { Media } from "./pages/Media";
import { Sponsors, Finance, Committees, Venue, Procurement, Team, Documents, Risks, Control } from "./pages/Ops";
import { Timeline } from "./pages/Timeline";
import { Delegates } from "./pages/Delegates";
import { Groups } from "./pages/Groups";
import { AllocationPage } from "./pages/Allocation";
import { Checkin } from "./pages/Checkin";
import { AIStudio, ApprovalsPage, Activity, Notifications, Settings } from "./pages/System";
import { Report } from "./pages/Report";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { Register } from "./pages/Register";
import { RegisterSuccess } from "./pages/RegisterSuccess";
import { PortalLogin } from "./pages/PortalLogin";
import { PortalProfile } from "./pages/PortalProfile";
import { PortalCommittees } from "./pages/PortalCommittees";
import { PortalStudyGuides } from "./pages/PortalStudyGuides";
import { PortalNotes } from "./pages/PortalNotes";
import { Apply } from "./pages/Apply";
import { ApplySuccess } from "./pages/ApplySuccess";
import { ApplicationsPanel } from "./pages/ApplicationsPanel";
import { DeptPortalLogin } from "./pages/DeptPortalLogin";
import { DeptProfile } from "./pages/DeptProfile";
import { DeptTasks } from "./pages/DeptTasks";
import { DeptGuides } from "./pages/DeptGuides";
import { TeamPortalLogin } from "./pages/TeamPortalLogin";
import { TeamDepartmentPortal } from "./pages/TeamDepartmentPortal";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Equity from "./pages/Equity";
import ComingSoon from "./pages/ComingSoon";

/* ────────────────────────────────────────────────────────────────
   PUBLIC FEATURE GATE

   The site is live, but every public feature is CLOSED except the
   Team Member Application (/apply). Delegate registration and the
   delegate portal stay shut until the date-drop.

   Flip `delegateRegistrationOpen` to true on launch day — every
   gated route re-opens at once. Nothing else needs editing.
   ──────────────────────────────────────────────────────────────── */
const delegateRegistrationOpen = false;

function Gated({ open, children }: { open: boolean; children: ReactElement }) {
  if (open) return <>{children}</>;
  return <ComingSoon />;
}

function Guard({ children }: { children: ReactElement }) {
  if (!api.token) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function LandingOrDash() {
  return <Home />;
}

export function App() {
  return (
    <TeamProvider>
      <AuthP>
        <PortalProvider>
          <DeptPortalProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes (no auth) */}
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/equity" element={<Equity />} />
                <Route path="/register" element={<Gated open={delegateRegistrationOpen}><Register /></Gated>} />
                <Route path="/register/success" element={<Gated open={delegateRegistrationOpen}><RegisterSuccess /></Gated>} />
                <Route path="/portal/login" element={<Gated open={delegateRegistrationOpen}><PortalLogin /></Gated>} />
                <Route path="/apply" element={<Apply />} />
                <Route path="/apply/success" element={<ApplySuccess />} />
                <Route path="/apply/portal/login" element={<DeptPortalLogin />} />

                {/* Team member portal */}
                <Route path="/team/login" element={<TeamPortalLogin />} />
                <Route path="/team" element={<TeamGuard><TeamPortalLayout /></TeamGuard>}>
                  <Route index element={<TeamDepartmentPortal />} />
                  <Route path=":section" element={<TeamDepartmentPortal />} />
                </Route>

                {/* Delegate portal (portal auth) — closed with registration */}
                <Route path="/portal" element={<Gated open={delegateRegistrationOpen}><PortalGuard><PortalLayout /></PortalGuard></Gated>}>
                  <Route index element={<PortalProfile />} />
                  <Route path="committees" element={<PortalCommittees />} />
                  <Route path="study-guides" element={<PortalStudyGuides />} />
                  <Route path="notes" element={<PortalNotes />} />
                </Route>

                {/* Department volunteer portal (dept portal auth) */}
                <Route path="/apply/portal" element={<DeptPortalGuard><DeptPortalLayout /></DeptPortalGuard>}>
                  <Route index element={<DeptProfile />} />
                  <Route path="tasks" element={<DeptTasks />} />
                  <Route path="guides" element={<DeptGuides />} />
                </Route>

                {/* Staff admin routes (staff auth required) */}
                <Route path="/login" element={<Login />} />
                <Route path="/home" element={<Home />} />
                <Route path="/" element={<LandingOrDash />} />
                <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
                <Route path="/reports" element={<Guard><Report /></Guard>} />
                <Route path="/tasks" element={<Guard><Tasks /></Guard>} />
                <Route path="/team-members" element={<Guard><Team /></Guard>} />
                <Route path="/timeline" element={<Guard><Timeline /></Guard>} />
                <Route path="/approvals" element={<Guard><ApprovalsPage /></Guard>} />
                <Route path="/risks" element={<Guard><Risks /></Guard>} />
                <Route path="/control" element={<Guard><Control /></Guard>} />
                <Route path="/delegates" element={<Guard><Delegates /></Guard>} />
                <Route path="/groups" element={<Guard><Groups /></Guard>} />
                <Route path="/allocation" element={<Guard><AllocationPage /></Guard>} />
                <Route path="/checkin" element={<Guard><Checkin /></Guard>} />
                <Route path="/committees" element={<Guard><Committees /></Guard>} />
                <Route path="/sponsors" element={<Guard><Sponsors /></Guard>} />
                <Route path="/finance" element={<Guard><Finance /></Guard>} />
                <Route path="/procurement" element={<Guard><Procurement /></Guard>} />
                <Route path="/venue" element={<Guard><Venue /></Guard>} />
                <Route path="/media" element={<Guard><Media /></Guard>} />
                <Route path="/ai" element={<Guard><AIStudio /></Guard>} />
                <Route path="/documents" element={<Guard><Documents /></Guard>} />
                <Route path="/activity" element={<Guard><Activity /></Guard>} />
                <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
                <Route path="/settings" element={<Guard><Settings /></Guard>} />
                <Route path="/ops/applications" element={<Guard><ApplicationsPanel /></Guard>} />

                {/* Catch-all — without this, any unknown URL renders nothing
                    (blank white page) because the SPA catch-all in main.py
                    still serves index.html for it. */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </DeptPortalProvider>
        </PortalProvider>
      </AuthP>
    </TeamProvider>
  );
}
