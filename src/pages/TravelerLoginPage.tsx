import { useState } from "react";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TravelerLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div data-feature="NFSTAY__TRAVELER_LOGIN" className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <NfsLogo className="justify-center text-2xl mb-4" />
        <h1 className="text-2xl font-bold">Sign in as Guest</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a magic link</p>

        {!sent ? (
          <form onSubmit={handleSend} className="space-y-4">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-[10px] h-11" required />
            <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
              {loading ? 'Sending...' : 'Send magic link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-accent-light rounded-xl p-4">
              <p className="text-sm">Check your inbox at <strong>{email}</strong></p>
            </div>
            <Button variant="outline" className="rounded-xl" disabled={countdown > 0} onClick={handleSend}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend magic link'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
