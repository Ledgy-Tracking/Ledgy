import { Navigate, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { SetupPage } from "./features/auth/SetupPage";
import { UnlockPage } from "./features/auth/UnlockPage";
import { Dashboard } from "./features/dashboard/Dashboard";
import { GuestGuard } from "./features/auth/GuestGuard";
import { UnlockGuard } from "./features/auth/UnlockGuard";
import { AppShell } from "./components/Layout/AppShell";
import { ErrorToast } from "./components/ErrorToast";
import { NotificationToast } from "./components/NotificationToast";
import { ProfileSelector } from "./features/profiles/ProfileSelector";
import { useUIStore } from "./stores/useUIStore";
import { useEffect } from "react";
import { LedgerView } from "./features/ledger/LedgerView";
import { TrashView } from "./features/ledger/TrashView";
import { ProjectDashboard } from "./features/projects/ProjectDashboard";
import { NodeCanvas } from "./features/nodeEditor/NodeCanvas";

function App() {
  const theme = useUIStore((state) => state.theme);

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

  return (
    <>
      <ErrorToast />
      <NotificationToast />
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

        <Route
          path="/app/:profileId"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectDashboard />} />
          <Route path="project/:projectId" element={<Dashboard />} />
          <Route path="settings" element={<div>Settings Placeholder</div>} />
          <Route path="ledger/:ledgerId" element={<LedgerView />} />
          <Route path="trash" element={<TrashView />} />
          <Route path="node-forge" element={<NodeCanvas />} />
          {/* Add more profile-scoped routes here */}
        </Route>

        {/* Root Redirects */}
        <Route path="/" element={<Navigate to="/profiles" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
