import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "./features/auth/AuthGuard";
import { SetupPage } from "./features/auth/SetupPage";

function App() {
  return (
    <Routes>
      <Route
        path="/setup"
        element={
          <AuthGuard>
            <SetupPage />
          </AuthGuard>
        }
      />

      <Route
        path="/"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />

      {/* Placeholder for Unlock route in Story 1.3 */}
      <Route path="/unlock" element={<div>Unlock UI Placeholder</div>} />
    </Routes>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-emerald-500">Ledgy Dashboard</h1>
      <p className="text-zinc-400">Your application is unlocked and secure.</p>

      <div className="mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl">
        <p className="text-sm text-zinc-500 italic">Encryption key is derived and held in volatile memory.</p>
      </div>
    </div>
  );
}

export default App;
