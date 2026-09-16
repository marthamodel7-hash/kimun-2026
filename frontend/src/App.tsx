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

function Guard({ children }: { children: ReactElement }) {
  if (!api.token) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function LandingOrDash() {
  if (api.token) return <Guard><Dashboard /></Guard>;
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
                <Route path="/register" element={<Register />} />
                <Route path="/register/success" element={<RegisterSuccess />} />
                <Route path="/portal/login" element={<PortalLogin />} />
                <Route path="/apply" element={<Apply />} />
                <Route path="/apply/success" element={<ApplySuccess />} />
                <Route path="/apply/portal/login" element={<DeptPortalLogin />} />

                {/* Team member portal */}
                <Route path="/team/login" element={<TeamPortalLogin />} />
                <Route path="/team" element={<TeamGuard><TeamPortalLayout /></TeamGuard>}>
                  <Route index element={<TeamDepartmentPortal />} />
                  <Route path=":section" element={<TeamDepartmentPortal />} />
                </Route>

                {/* Delegate portal (portal auth) */}
                <Route path="/portal" element={<PortalGuard><PortalLayout /></PortalGuard>}>
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
              </Routes>
            </BrowserRouter>
          </DeptPortalProvider>
        </PortalProvider>
      </AuthP>
    </TeamProvider>
  );
}
