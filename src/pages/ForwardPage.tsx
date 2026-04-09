import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Home } from "lucide-react";

/**
 * /forward?redirect_uri=<encoded-url>&brand=<operator-brand-name>
 *
 * Shown when a traveler clicks a property on nfstay.app whose operator
 * has a custom domain or subdomain. Redirects them to the operator's
 * own branded booking site.
 */
export default function ForwardPage() {
  const [params] = useSearchParams();
  const redirectUri = params.get("redirect_uri") || "";
  const brand = params.get("brand") || "the operator's site";

  const [countdown, setCountdown] = useState(3);
  const [departed, setDeparted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only allow http / https — block javascript: and other schemes
  const isSafeUrl =
    redirectUri.startsWith("http://") || redirectUri.startsWith("https://");

  useEffect(() => {
    if (!isSafeUrl) return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          setDeparted(true);
          window.location.href = redirectUri;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSafeUrl, redirectUri]);

  const handleGoNow = () => {
    if (!isSafeUrl) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDeparted(true);
    window.location.href = redirectUri;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md px-10 py-10 flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Logo transfer animation */}
        <div className="flex items-center gap-3">

          {/* NFStay logo mark — bordered square matching NfsLogo */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ border: "2.5px solid #0a0a0a" }}
          >
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "#0a0a0a",
                letterSpacing: 0.5,
              }}
            >
              nf
            </span>
          </div>

          {/* Arrow */}
          <div className="flex items-center text-gray-400">
            <span className="w-5 h-px bg-gray-300 block" />
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Operator — Home icon in dark circle, matching Dtravel style */}
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Spinner / departed */}
        {!departed ? (
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        ) : (
          <ExternalLink className="w-6 h-6 text-gray-700" />
        )}

        {/* Message */}
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          {isSafeUrl ? (
            departed ? (
              <>Redirecting you to <strong>{brand}</strong>…</>
            ) : (
              <>
                You are now leaving <strong>nfstay.app</strong> and will be
                redirected to a direct booking site…
              </>
            )
          ) : (
            <span className="text-destructive">Invalid redirect URL.</span>
          )}
        </p>

        {isSafeUrl && !departed && (
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleGoNow}
              className="w-full py-2.5 rounded-full bg-primary-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go now
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center max-w-xs">
        You are being redirected to a partner's direct booking site.
      </p>
    </div>
  );
}
