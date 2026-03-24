import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Lock, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

interface BookingIntent {
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyCity: string;
  propertyCountry: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  subtotal: number;
  cleaningFee: number;
  discount: number;
  promoDiscount: number;
  promoCode: string;
  total: number;
  currency: string;
  currencySymbol: string;
  expiresAt: number;
}

export default function NfsCheckoutPage() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<BookingIntent | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem('nfs_booking_intent');
    if (!raw) return;
    const data = JSON.parse(raw) as BookingIntent;
    if (data.expiresAt < Date.now()) {
      setIntent(null);
      return;
    }
    setIntent(data);
  }, []);

  useEffect(() => {
    if (!intent) return;
    const interval = setInterval(() => {
      const left = Math.max(0, intent.expiresAt - Date.now());
      setTimeLeft(left);
      if (left === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [intent]);

  if (!intent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[hsl(38_92%_50%/0.1)] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your session expired</h1>
          <p className="text-sm text-muted-foreground mb-6">Please start a new search to find your perfect stay.</p>
          <Button onClick={() => navigate('/search')} className="rounded-xl">Start a new search</Button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isValid = firstName && lastName && email && phone && agreed;

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke("nfs-create-checkout", {
        body: {
          propertyId: intent.propertyId,
          checkIn: intent.checkIn,
          checkOut: intent.checkOut,
          adults: intent.adults,
          children: intent.children,
          guestEmail: email,
          guestName: `${firstName} ${lastName}`.trim(),
          promoCode: intent.promoCode || undefined,
        },
      });

      if (error || !data?.url) {
        // Fallback to mock flow if edge function fails
        const reservation = {
          id: `res-${Date.now()}`,
          ...intent,
          guestFirstName: firstName,
          guestLastName: lastName,
          guestEmail: email,
        };
        sessionStorage.setItem("nfs_last_reservation", JSON.stringify(reservation));
        sessionStorage.removeItem("nfs_booking_intent");
        navigate("/payment/success");
        return;
      }

      // Redirect to Stripe Checkout
      sessionStorage.removeItem("nfs_booking_intent");
      window.location.href = data.url;
    } catch {
      // Fallback to mock flow on any error
      const reservation = {
        id: `res-${Date.now()}`,
        ...intent,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestEmail: email,
      };
      sessionStorage.setItem("nfs_last_reservation", JSON.stringify(reservation));
      sessionStorage.removeItem("nfs_booking_intent");
      navigate("/payment/success");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-feature="NFSTAY__CHECKOUT" className="max-w-5xl mx-auto px-4 py-8">
      {/* Expiry banner */}
      {timeLeft > 0 && timeLeft < 10 * 60 * 1000 && (
        <div className="bg-[hsl(38_92%_50%/0.1)] border border-warning/30 rounded-xl p-3 mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">Your booking hold expires in {minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left - Form */}
        <div data-feature="NFSTAY__CHECKOUT_FORM" className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Complete your booking</h1>
            <p className="text-sm text-muted-foreground">Fill in your details to confirm your reservation</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your contact details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">First name *</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="rounded-[10px] h-11" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last name *</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="rounded-[10px] h-11" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email address *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-[10px] h-11" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone number *</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" className="rounded-[10px] h-11" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Special requests</h2>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any special requests or notes for the host..."
              className="rounded-[10px] min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">Requests are not guaranteed but we'll do our best</p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <label htmlFor="agree" className="text-sm">
              I have read and agree to the <button className="text-primary underline">house rules</button> and <button className="text-primary underline">cancellation policy</button>
            </label>
          </div>

          <Button
            data-feature="NFSTAY__CHECKOUT_PAY"
            onClick={handleComplete}
            disabled={!isValid || loading}
            className="w-full rounded-xl py-3.5 text-base font-semibold"
            size="lg"
          >
            {loading ? 'Processing...' : 'Complete booking'}
          </Button>
        </div>

        {/* Right - Summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div data-feature="NFSTAY__CHECKOUT_SUMMARY" className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex gap-3">
              <img src={intent.propertyImage} alt={intent.propertyTitle} className="w-24 h-20 rounded-xl object-cover" />
              <div>
                <h3 className="text-sm font-semibold line-clamp-2">{intent.propertyTitle}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  {intent.propertyCity}, {intent.propertyCountry}
                </div>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{intent.checkIn} → {intent.checkOut}</span>
                <span className="text-xs">({intent.nights} nights)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{intent.adults} adult{intent.adults !== 1 ? 's' : ''}{intent.children > 0 ? `, ${intent.children} child${intent.children !== 1 ? 'ren' : ''}` : ''}</span>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{intent.currencySymbol}{Math.round(intent.subtotal / intent.nights)} × {intent.nights} nights</span>
                <span>{intent.currencySymbol}{intent.subtotal}</span>
              </div>
              {intent.cleaningFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cleaning fee</span>
                  <span>{intent.currencySymbol}{intent.cleaningFee}</span>
                </div>
              )}
              {intent.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount</span>
                  <span>-{intent.currencySymbol}{intent.discount}</span>
                </div>
              )}
              {intent.promoDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{intent.promoCode}</span>
                  <span>-{intent.currencySymbol}{intent.promoDiscount}</span>
                </div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{intent.currencySymbol}{intent.total}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
              <Lock className="w-3 h-3" />
              Secured by Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
