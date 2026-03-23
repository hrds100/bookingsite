import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NfsAuthSlidePanel } from "@/components/nfs/NfsAuthSlidePanel";
import type { SocialType } from "@/lib/particle";

const PROVIDERS: { id: SocialType; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.43c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.96zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "Continue with X",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    ),
  },
];

type ViewState = "social" | "email";

function AuthShell({ children, showTabs, heading, subtitle }: { children: React.ReactNode; showTabs: boolean; heading: string; subtitle: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "#f3f3ee" }}>
      <div className="flex w-full h-screen overflow-hidden p-2 gap-2" style={{ backgroundColor: "#f3f3ee" }}>
        <div className="flex flex-col items-center justify-between flex-1 lg:w-1/2 w-full h-full overflow-y-auto bg-white rounded-3xl border" style={{ borderColor: "#e8e5df", padding: "clamp(24px, 3.5vh, 64px)" }}>
          <div className="flex items-center justify-center w-full">
            <Link to="/" className="font-extrabold text-[#0a0a0a] tracking-tight no-underline" style={{ fontSize: "clamp(18px, 2.5vh, 24px)" }}>nfstay</Link>
          </div>

          <div className="flex flex-col items-center justify-center w-full max-w-[480px] flex-1">
            <div className="text-center w-full" style={{ marginBottom: "clamp(16px, 2.5vh, 32px)" }}>
              <h2 className="font-semibold text-[#0a0a0a] leading-tight tracking-tight" style={{ fontSize: "clamp(20px, 2.7vh, 30px)" }}>{heading}</h2>
              <p className="text-base text-[#737373] text-center mt-1.5 leading-relaxed">{subtitle}</p>
            </div>

            {showTabs && (
              <div className="grid grid-cols-2 w-full border rounded-xl" style={{ height: 40, gap: 2, backgroundColor: "#f3f3ee", borderColor: "#e8e5df", padding: 2, marginBottom: "clamp(11px, 2vh, 29px)" }}>
                <Link to="/signin" className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-transparent text-[#73757c] hover:bg-white/50 no-underline">Sign In</Link>
                <button className="flex items-center justify-center border-none rounded-[10px] text-sm font-medium cursor-pointer h-full bg-white text-[#1b1b1b]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)" }}>Register</button>
              </div>
            )}

            {children}
          </div>
          <div />
        </div>
        <NfsAuthSlidePanel />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, signInWithSocial, user } = useAuth();
  const [view, setView] = useState<ViewState>("social");
  const [socialLoading, setSocialLoading] = useState<SocialType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSocialLogin = async (provider: SocialType) => {
    setSocialLoading(provider);
    setError("");
    try {
      const { error: socialError } = await signInWithSocial(provider);
      if (socialError) {
        setError(socialError.message);
      } else {
        navigate("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const { error: authError } = await signUp(email.trim().toLowerCase(), password, name.trim());
      if (authError) {
        setError(authError.message);
      } else {
        navigate("/verify-email");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  // Social view (primary)
  if (view === "social") {
    return (
      <AuthShell showTabs heading="Create your account" subtitle="Book unique stays or list your property on nfstay">
        <div className="w-full flex flex-col" style={{ gap: "clamp(9px, 1.8vh, 22px)" }}>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {/* Social stacked */}
          <div className="flex flex-col gap-2 w-full">
            {PROVIDERS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => handleSocialLogin(id)} disabled={socialLoading !== null}
                className="w-full flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8] disabled:opacity-50 relative"
                style={{ height: 45, padding: "8px 12px" }}>
                {icon} {label}
                {socialLoading === id && <Loader2 className="w-4 h-4 animate-spin absolute right-4" />}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-[#e5e5e5]" />
            <span className="text-base text-[#737373] whitespace-nowrap">Or</span>
            <div className="h-px flex-1 bg-[#e5e5e5]" />
          </div>

          {/* Email signup button */}
          <button onClick={() => setView("email")}
            className="w-full flex items-center justify-center gap-2 bg-transparent text-[#0a0a0a] border border-[#e5e5e5] rounded-full text-[15px] font-medium cursor-pointer transition-all duration-150 hover:bg-[#f5f5f5] hover:border-[#c8c8c8]"
            style={{ height: 45, padding: "8px 12px" }}>
            <Mail className="w-5 h-5" /> Sign up with Email
          </button>

          <p className="text-sm text-[#737373] text-center mt-2">
            Already have an account?{" "}
            <Link to="/signin" className="text-[#1e9a80] font-semibold no-underline">Sign in</Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  // Email view
  return (
    <AuthShell showTabs={false} heading="Sign up with Email" subtitle="Fill in your details to create an account">
      <div className="w-full flex flex-col" style={{ gap: "clamp(9px, 1.8vh, 22px)" }}>
        <button onClick={() => setView("social")} className="flex items-center gap-1.5 text-sm text-[#737373] bg-transparent border-none cursor-pointer p-0 hover:text-[#0a0a0a] mb-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input type="text" placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} required
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: "4px 12px 4px 40px" }} />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: "4px 12px 4px 40px" }} />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: "4px 40px 4px 40px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#525252] tracking-wide">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none" />
              <input type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full h-[41px] bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[10px] text-sm outline-none transition-all duration-150 shadow-[0_4px_8px_-1px_rgba(0,0,0,0.05)] focus:border-[#1e9a80] focus:shadow-[0_0_0_3px_rgba(30,154,128,0.15)]"
                style={{ padding: "4px 40px 4px 40px" }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5 text-[#737373] hover:text-[#0a0a0a] flex items-center">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ height: 37, backgroundColor: "#1e9a80", fontSize: 16, padding: "8px 16px", border: "none", boxShadow: "0 4px 8px -1px rgba(0,0,0,0.05)" }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-[#737373] text-center mt-2">
          Already have an account?{" "}
          <Link to="/signin" className="text-[#1e9a80] font-semibold no-underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
