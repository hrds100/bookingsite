import { createRoot } from "react-dom/client";
import { initSentry, Sentry } from "@/lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Sentry: silently no-ops if VITE_SENTRY_DSN is not set
initSentry();

function FallbackUI() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', background: '#FFFFFF' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: '#1E9A80', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<FallbackUI />}>
    <App />
  </Sentry.ErrorBoundary>
);
