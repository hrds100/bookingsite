import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackState = "loading" | "success" | "error" | "missing_params";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [callbackState, setCallbackState] = useState<CallbackState>("loading");

  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  useEffect(() => {
    // Determine callback state from query params
    if (!provider) {
      setCallbackState("missing_params");
      return;
    }

    if (status === "success" || success === "connected") {
      setCallbackState("success");
      // Auto-redirect to settings after 2 seconds
      const timer = setTimeout(() => {
        navigate("/nfstay/settings", { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (status === "error" || error) {
      setCallbackState("error");
      return;
    }

    // No recognizable status params
    setCallbackState("missing_params");
  }, [provider, status, success, error, navigate]);

  const errorMessage = error
    ? error.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
    : "An unknown error occurred during authorization.";

  return (
    <div
      data-feature="NFSTAY__OAUTH_CALLBACK"
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center space-y-4 max-w-sm">
        {callbackState === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Processing {provider} authorization...
            </p>
          </>
        )}

        {callbackState === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-semibold">Connected successfully</h2>
            <p className="text-sm text-muted-foreground">
              Your {provider} account has been connected. Redirecting to
              settings...
            </p>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
          </>
        )}

        {callbackState === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Connection failed</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => navigate("/nfstay/settings", { replace: true })}
                className="w-full rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to settings
              </Button>
            </div>
          </>
        )}

        {callbackState === "missing_params" && (
          <>
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">Missing callback parameters</h2>
            <p className="text-sm text-muted-foreground">
              This page requires valid authorization callback parameters. If you
              arrived here by mistake, return to settings.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/nfstay/settings", { replace: true })}
              className="rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
