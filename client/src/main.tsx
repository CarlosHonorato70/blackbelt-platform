// BlackBelt Platform v1.0 — blackbeltconsultoria.com
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element não encontrado");
}

const root = createRoot(container);
root.render(<App />);

// Register service worker for PWA install support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
