import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const navigate = useNavigate();
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }

      // Check if user is an operator
      const userId = data.user?.id;
      if (userId) {
        const { data: opRecord } = await supabase
          .from("nfs_operators")
          .select("id")
          .eq("profile_id", userId)
          .maybeSingle();

        if (opRecord) {
          navigate("/nfstay");
        } else {
          navigate("/traveler/reservations");
        }
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

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to your account
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

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
