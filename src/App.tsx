import { Navigate, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { SetupPage } from "./features/auth/SetupPage";
import { UnlockPage } from "./features/auth/UnlockPage";
import { Dashboard } from "./features/dashboard/Dashboard";
import { GuestGuard } from "./features/auth/GuestGuard";
import { UnlockGuard } from "./features/auth/UnlockGuard";
import { AutoLock } from "./features/auth/AutoLock";
import { ErrorToast } from "./components/ErrorToast";
import { NotificationToast } from "./components/NotificationToast";
import { ProfileSelector } from "./features/profiles/ProfileSelector";
import { useUIStore } from "./stores/useUIStore";
import { useEffect } from "react";
import { LedgerView } from "./features/ledger/LedgerView";
import { TrashView } from "./features/ledger/TrashView";
import { ProjectDashboard } from "./features/projects/ProjectDashboard";
import { NodeCanvas } from "./features/nodeEditor/NodeCanvas";
import { ReactFlowProvider } from "@xyflow/react";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ErrorBoundary } from "./features/shell/ErrorBoundary";
import { AppShell } from "./features/shell/AppShell";

function App() {
  const theme = useUIStore((state) => state.theme);
  const density = useUIStore((state) => state.density);

  useEffect(() => {
    const html = window.document.documentElement;
    const body = window.document.body;

    if (theme === 'dark') {
      html.classList.add('dark');
      body.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
      html.style.colorScheme = 'light';
    }
  }, [theme]);

  // Apply density class to body
  useEffect(() => {
    const body = window.document.body;
    if (density === 'compact') {
      body.classList.add('density-compact');
      body.classList.remove('density-comfortable');
    } else {
      body.classList.add('density-comfortable');
      body.classList.remove('density-compact');
    }
  }, [density]);

  return (
    <>
      <ErrorToast />
      <NotificationToast />
      {/* Auto-lock on tab close/visibility change */}
      <AutoLock />
      {/* App-level error boundary wraps all routes */}
      <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/setup"
            element={
              <GuestGuard>
                <SetupPage />
              </GuestGuard>
            }
          />

          <Route
            path="/unlock"
            element={
              <UnlockGuard>
                <UnlockPage />
              </UnlockGuard>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/profiles"
            element={
              <AuthGuard>
                <ProfileSelector />
              </AuthGuard>
            }
          />

          {/* Route-level error boundary for main app shell */}
          <Route
            path="/app/:profileId"
            element={
              <ErrorBoundary>
                <AuthGuard>
                  <ReactFlowProvider>
                    <AppShell />
                  </ReactFlowProvider>
                </AuthGuard>
              </ErrorBoundary>
            }
          >
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectDashboard />} />
            <Route path="project/:projectId" element={<Dashboard />} />
            <Route path="project/:projectId/node-forge" element={<NodeCanvas />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="project/:projectId/ledger/:ledgerId" element={<LedgerView />} />
            <Route path="trash" element={<TrashView />} />
            {/* Add more profile-scoped routes here */}
          </Route>

          {/* Root Redirects */}
          <Route path="/" element={<Navigate to="/profiles" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
