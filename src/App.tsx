import { Navigate, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { SetupPage } from "./features/auth/SetupPage";
import { UnlockPage } from "./features/auth/UnlockPage";
import { Dashboard } from "./features/dashboard/Dashboard";

function App() {
  return (
    <Routes>
      <Route
        path="/setup"
        element={<SetupPage />}
      />

      <Route
        path="/"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />

      <Route
        path="/unlock"
        element={<UnlockPage />}
      />

      <Route
        path="/profiles"
        element={
          <AuthGuard>
            <div className="p-20 text-emerald-500 font-bold">Profile Selector Placeholder</div>
          </AuthGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
