import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";

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
        <div className="flex items-center gap-4">
          {/* NFStay logo mark */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(270deg, #27dea0 0%, #1E9A80 100%)" }}
          >
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: "#fff",
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

          {/* Operator logo / initials */}
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-sm font-bold uppercase">
              {brand.slice(0, 2)}
            </span>
          </div>
        </div>

        {/* Spinner / departed */}
        {!departed ? (
          <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
        ) : (
          <ExternalLink className="w-6 h-6 text-primary" />
        )}

        {/* Message */}
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          {isSafeUrl ? (
            departed ? (
              <>Redirecting you to <strong>{brand}</strong>…</>
            ) : (
              <>
                You are now leaving <strong>nfstay.app</strong> and will be
                redirected to{" "}
                <strong>{brand}</strong>'s direct booking site in{" "}
                <span className="text-primary font-semibold">{countdown}</span>s…
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
        nfstay is not responsible for third-party content or pricing.
      </p>
    </div>
  );
}
