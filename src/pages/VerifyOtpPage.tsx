import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendOtp, verifyOtp } from "@/lib/n8n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { NfsAuthSlidePanel } from "@/components/nfs/NfsAuthSlidePanel";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get("phone") || "";
  const name = params.get("name") || "";
  const email = params.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(300); // 5 min
  const [canResend, setCanResend] = useState(false);
  const verifyingRef = useRef(false);
  const toastFiredRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 4 || verifyingRef.current || verified) return;
    verifyingRef.current = true;
    setLoading(true);
    setError("");

    // Verify OTP via n8n webhook
    try {
      const result = await verifyOtp({ phone, code: otp, name, email });
      if (!result.success) {
        verifyingRef.current = false;
        setError("Invalid code. Please check your WhatsApp and try again.");
        setOtp("");
        setLoading(false);
        return;
      }
    } catch {
      verifyingRef.current = false;
      setError("Could not verify code. Please try again.");
      setOtp("");
      setLoading(false);
      return;
    }

    // Update whatsapp_verified in profiles (best-effort)
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        await (supabase.from("profiles") as any)
          .update({ whatsapp: phone, whatsapp_verified: true })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("Profile update failed (non-blocking):", err);
    }

    setVerified(true);
    if (!toastFiredRef.current) {
      toastFiredRef.current = true;
      toast.success("WhatsApp verified! Welcome to nfstay!");
    }

    // Generate JWT for wallet creation
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const supabaseUrl =
          import.meta.env.VITE_SUPABASE_URL ||
          "https://asazddtvjvmckouxcmmo.supabase.co";
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        const jwtRes = await fetch(
          `${supabaseUrl}/functions/v1/particle-generate-jwt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
            },
            body: JSON.stringify({ user_id: userId }),
          }
        );
        const jwtData = await jwtRes.json();
        if (jwtData.jwt) {
          try {
            sessionStorage.setItem("particle_jwt", jwtData.jwt);
          } catch {
            /* skip */
          }
          console.log("Particle JWT stored for wallet creation");
        }
      }
    } catch (err) {
      console.log("JWT generation skipped (non-blocking):", err);
    }

    setTimeout(() => {
      navigate("/");
    }, 1500);
    setLoading(false);
  };

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (otp.length === 4 && !verifyingRef.current && !verified) handleVerify();
  }, [otp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async () => {
    if (!canResend && timer > 0) return;
    setLoading(true);
    setError("");
    try {
      await sendOtp(phone);
      toast.success("New code sent via WhatsApp");
      setTimer(300);
      setCanResend(false);
    } catch {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  if (!phone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-[#737373]">No phone number provided.</p>
          <Link
            to="/signup"
            className="text-primary font-semibold mt-2 inline-block no-underline"
          >
            Go to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-feature="NFSTAY__OTP"
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#f3f3ee" }}
    >
      <div
        className="flex w-full h-screen overflow-hidden p-2 gap-2"
        style={{ backgroundColor: "#f3f3ee" }}
      >
        {/* Left panel */}
        <div
          className="flex flex-col items-center justify-between flex-1 lg:w-1/2 w-full h-full overflow-y-auto bg-white rounded-3xl border"
          style={{
            borderColor: "#e8e5df",
            padding: "clamp(24px, 3.5vh, 64px)",
          }}
        >
          <div className="flex items-center justify-center w-full">
            <Link
              to="/"
              className="flex items-center gap-[3px] no-underline"
            >
              <span
                className="flex items-center justify-center font-bold leading-none"
                style={{
                  width: 28,
                  height: 28,
                  border: "2px solid #0a0a0a",
                  borderRadius: 6,
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 12,
                  color: "#0a0a0a",
                }}
              >
                nf
              </span>
              <span
                className="leading-none"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 400,
                  fontSize: 20,
                  color: "#0a0a0a",
                  letterSpacing: 1.5,
                }}
              >
                stay
              </span>
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center w-full max-w-[480px] flex-1">
            {verified ? (
              <div className="text-center py-8">
                <CheckCircle2
                  className="w-16 h-16 mx-auto"
                  style={{ color: "hsl(var(--primary))" }}
                />
                <h2
                  className="font-semibold text-[#0a0a0a] mt-4"
                  style={{ fontSize: "clamp(20px, 2.7vh, 28px)" }}
                >
                  Verified!
                </h2>
                <p className="text-sm text-[#737373] mt-1">
                  Redirecting to your homepage...
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signup")}
                  className="flex items-center gap-1.5 text-sm text-[#737373] bg-transparent border-none cursor-pointer p-0 hover:text-[#0a0a0a] mb-6 self-start"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to signup
                </button>

                <div
                  className="text-center w-full"
                  style={{ marginBottom: "clamp(16px, 2.5vh, 32px)" }}
                >
                  <h2
                    className="font-semibold text-[#0a0a0a] leading-tight tracking-tight"
                    style={{ fontSize: "clamp(20px, 2.7vh, 28px)" }}
                  >
                    Verify your WhatsApp
                  </h2>
                  <p className="text-base text-[#737373] text-center mt-1.5 leading-relaxed">
                    We sent a 4-digit code to{" "}
                    <span className="font-medium text-[#0a0a0a]">{phone}</span>{" "}
                    via WhatsApp.
                  </p>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div
                    className="text-sm font-mono font-semibold px-3 py-1 rounded-full"
                    style={{
                      background:
                        timer > 60
                          ? "rgba(30,154,128,0.1)"
                          : "rgba(239,68,68,0.1)",
                      color: timer > 60 ? "#1e9a80" : "#EF4444",
                    }}
                  >
                    {formatTime(timer)}
                  </div>
                  <span className="text-xs text-[#737373]">remaining</span>
                </div>

                {/* OTP input */}
                <div data-feature="NFSTAY__OTP_INPUT" className="flex justify-center mb-6">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setError("");
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center mb-4">
                    {error}
                  </p>
                )}

                {/* Verify button */}
                <button
                  data-feature="NFSTAY__OTP_SUBMIT"
                  onClick={handleVerify}
                  disabled={loading || otp.length !== 4}
                  className="w-full rounded-lg font-medium text-white cursor-pointer transition-all duration-150 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    height: 37,
                    backgroundColor: "hsl(var(--primary))",
                    fontSize: 16,
                    padding: "8px 16px",
                    border: "none",
                    boxShadow: "0 4px 8px -1px rgba(0,0,0,0.05)",
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {loading ? "Verifying..." : "Verify WhatsApp"}
                </button>

                {/* Resend */}
                <button
                  data-feature="NFSTAY__OTP_RESEND"
                  onClick={handleResend}
                  disabled={loading || (!canResend && timer > 0)}
                  className="w-full text-sm text-[#737373] hover:text-[#0a0a0a] mt-3 disabled:opacity-50 transition-opacity bg-transparent border-none cursor-pointer"
                >
                  {canResend
                    ? "Didn't receive it? Resend code"
                    : `Resend available in ${formatTime(timer)}`}
                </button>
              </>
            )}
          </div>

          <div />
        </div>

        {/* Right panel */}
        <NfsAuthSlidePanel />
      </div>
    </div>
  );
}
