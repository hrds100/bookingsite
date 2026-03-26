import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { notifyGuestSignup } from "@/lib/n8n";

type Mode = "guest" | "operator";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        toast.error(error.message);
      } else {
        // Fire welcome email via n8n (fire-and-forget)
        notifyGuestSignup({ guestName: name, guestEmail: email });
        toast.success("Account created! You can now sign in.");
        navigate("/signin");
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
              <h1 className="text-xl font-bold mb-1">Create your account</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Sign up to book properties and manage reservations
              </p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-1.5"
                    autoComplete="name"
                  />
                </div>
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
                    placeholder="At least 6 characters"
                    className="mt-1.5"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="mt-1.5"
                    autoComplete="new-password"
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
                  Create Account
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <h1 className="text-xl font-bold">Operator access</h1>
              <p className="text-sm text-muted-foreground">
                Operators manage their properties on hub.nfstay.com
              </p>
              <a
                href="https://hub.nfstay.com/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-gradient text-white font-medium hover:opacity-90 transition-opacity"
              >
                Go to Hub Dashboard
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-sm text-muted-foreground">
                Already an operator?{" "}
                <a
                  href="https://hub.nfstay.com/signin"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in on Hub
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
