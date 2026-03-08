import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "./features/auth/useAuthStore";
import "./index.css";

// Await initSession before rendering so the app never renders with stale auth
// state — prevents the TOTP-screen flash for passphrase-protected sessions on
// cold start and ensures unhandled initSession rejections are surfaced.
useAuthStore
  .getState()
  .initSession()
  .catch(console.error)
  .finally(() => {
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    );
  });
