import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthBridgePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const redirectTo = searchParams.get("redirect") || "/nfstay";

    if (!accessToken || !refreshToken) {
      window.location.href = "https://hub.nfstay.com/signin";
      return;
    }

    (async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        // Check if user has an operator record, if not auto-create one
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: operator } = await supabase
            .from("nfs_operators")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (!operator) {
            // Auto-create operator from profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, whatsapp")
              .eq("id", user.id)
              .single();

            const brandName =
              profile?.name || user.email?.split("@")[0] || "My Brand";
            const subdomain = brandName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .slice(0, 20);

            await supabase.from("nfs_operators").insert({
              profile_id: user.id,
              brand_name: brandName,
              subdomain: subdomain,
              accent_color: "#22c55e",
              contact_email: user.email || "",
            });
          }
        }

        // Navigate to the requested page
        navigate(redirectTo, { replace: true });
      } catch (err) {
        console.error("Bridge auth failed:", err);
        setStatus("Authentication failed. Redirecting...");
        setTimeout(() => {
          window.location.href = "https://hub.nfstay.com/signin";
        }, 2000);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
