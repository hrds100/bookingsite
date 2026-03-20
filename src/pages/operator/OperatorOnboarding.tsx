import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CreditCard, User, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROPERTY_TYPES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

const steps = [
  { icon: User, label: "Business Info" },
  { icon: Building2, label: "First Property" },
  { icon: CreditCard, label: "Payout Setup" },
  { icon: CheckCircle2, label: "Complete" },
];

export default function OperatorOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep(s => Math.min(s + 1, 3));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const finish = () => {
    toast({ title: "Welcome aboard! 🎉", description: "Your operator account is ready." });
    navigate("/nfstay");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold">NF<span className="text-primary">Stay</span></span>
          <span className="text-sm text-muted-foreground">Operator Onboarding</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-accent-light text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                <s.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Business Info */}
        {step === 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground mt-1">This information will be used for your operator profile and guest communications.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Business Name</Label><Input placeholder="Sunset Properties Ltd" className="mt-1.5" /></div>
              <div><Label>Contact Email</Label><Input type="email" placeholder="hello@company.com" className="mt-1.5" /></div>
              <div><Label>Phone Number</Label><Input placeholder="+44 20 7946 0958" className="mt-1.5" /></div>
              <div className="md:col-span-2"><Label>Website (optional)</Label><Input placeholder="https://company.com" className="mt-1.5" /></div>
            </div>
          </div>
        )}

        {/* Step 1: First Property */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Add your first property</h2>
              <p className="text-sm text-muted-foreground mt-1">You can add more properties later from your dashboard.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Property Name</Label><Input placeholder="Marina View Apartment" className="mt-1.5" /></div>
              <div>
                <Label>Property Type</Label>
                <Select><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>City</Label><Input placeholder="Dubai" className="mt-1.5" /></div>
              <div><Label>Country</Label><Input placeholder="UAE" className="mt-1.5" /></div>
              <div><Label>Base Rate (£/night)</Label><Input type="number" placeholder="150" className="mt-1.5" /></div>
            </div>
          </div>
        )}

        {/* Step 2: Payout */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Set up payouts</h2>
              <p className="text-sm text-muted-foreground mt-1">Connect your Stripe account to receive payouts from guest bookings.</p>
            </div>
            <div className="bg-accent-light border border-primary/20 rounded-xl p-6 text-center">
              <CreditCard className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Connect with Stripe</h3>
              <p className="text-sm text-muted-foreground mb-4">Secure payment processing with automatic payouts after guest check-out.</p>
              <Button className="rounded-lg">Connect Stripe Account</Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">You can skip this step and set up payouts later in Settings.</p>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">You're all set!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Your operator account is ready. Head to your dashboard to manage properties, view reservations, and customise your branding.</p>
            <Button onClick={finish} className="rounded-lg gap-2">Go to Dashboard <ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={prev} disabled={step === 0} className="gap-2 rounded-lg"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <div className="flex gap-3">
              {step < 2 && <Button variant="ghost" onClick={() => setStep(3)} className="rounded-lg text-muted-foreground">Skip for now</Button>}
              <Button onClick={next} className="rounded-lg gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
