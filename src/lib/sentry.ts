import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // silently no-op when not configured

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
    });
  } catch (e) {
    // Sentry failure must never crash the app
    console.warn("Sentry init failed:", e);
  }
}

export { Sentry };
