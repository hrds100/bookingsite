import { useEffect } from "react";

export default function SignInPage() {
  useEffect(() => {
    window.location.href = "https://hub.nfstay.com/signin";
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to hub.nfstay.com...</p>
    </div>
  );
}
