import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type Mode = "guest" | "operator";

export default function SignInPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("guest");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/traveler/reservations");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Link to="/">
            <NfsLogo />
          </Link>
        </div>

        {/* Toggle pill */}
        <div className="flex justify-center">
          <div className="flex items-center bg-muted rounded-full p-1">
            <button
              onClick={() => setMode("guest")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === "guest"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Guest
            </button>
            <button
              onClick={() => setMode("operator")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === "operator"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Operator
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {mode === "guest" ? (
            <>
              <h1 className="text-xl font-bold mb-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Sign in to view your reservations
              </p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="mt-1.5"
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-primary-gradient text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Sign In
                </Button>
              </form>

              <div className="mt-4 text-center space-y-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <h1 className="text-xl font-bold">Operator access</h1>
              <p className="text-sm text-muted-foreground">
                Operators manage their properties on hub.nfstay.com
              </p>
              <a
                href="https://hub.nfstay.com/signin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-gradient text-white font-medium hover:opacity-90 transition-opacity"
              >
                Go to Hub Dashboard
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-sm text-muted-foreground">
                New operator?{" "}
                <a
                  href="https://hub.nfstay.com/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up on Hub
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
