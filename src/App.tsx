import { Navigate, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { SetupPage } from "./features/auth/SetupPage";
import { UnlockPage } from "./features/auth/UnlockPage";
import { Dashboard } from "./features/dashboard/Dashboard";
import { GuestGuard } from "./features/auth/GuestGuard";
import { UnlockGuard } from "./features/auth/UnlockGuard";
import { AppShell } from "./components/Layout/AppShell";
import { ErrorToast } from "./components/ErrorToast";

function App() {
  return (
    <>
      <ErrorToast />
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
              <div className="p-20 text-emerald-500 font-bold bg-zinc-950 min-h-screen">
                Profile Selector Placeholder
              </div>
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
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<div>Settings Placeholder</div>} />
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
