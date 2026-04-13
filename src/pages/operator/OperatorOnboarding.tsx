import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Building2, Palette, User, CheckCircle2, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNfsOperatorCreate, useNfsOperator } from "@/hooks/useNfsOperator";
import { notifyNewOperator } from "@/lib/email";

const ACCENT_COLORS = [
  { label: "Green", value: "#22c55e" },
  { label: "Orange", value: "#f97316" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Red", value: "#ef4444" },
  { label: "Teal", value: "#14b8a6" },
];

const steps = [
  { icon: User, label: "Brand Info" },
  { icon: Building2, label: "Subdomain" },
  { icon: Palette, label: "Branding" },
  { icon: CheckCircle2, label: "Complete" },
];

export default function OperatorOnboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const createOperator = useNfsOperatorCreate();
  const { data: existingOperator, isFetched: operatorChecked } = useNfsOperator();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [accentColor, setAccentColor] = useState("#22c55e");

  if (loading || (!!user && !operatorChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "https://hub.nfstay.com/signin";
    return null;
  }

  // Already an operator — go to dashboard
  if (existingOperator) {
    return <Navigate to="/nfstay" replace />;
  }

  const subdomainSlug = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");

  const canFinish = brandName.trim().length >= 2 && subdomainSlug.length >= 2;

  const finish = async () => {
    if (!canFinish) {
      toast({ title: "Missing info", description: "Please fill in brand name and subdomain.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await createOperator.mutateAsync({
        brand_name: brandName.trim(),
        subdomain: subdomainSlug,
        accent_color: accentColor,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
      });
      toast({ title: "Welcome aboard!", description: "Your operator account is ready." });
      // Notify admin about new operator signup
      notifyNewOperator({
        operatorName: brandName.trim(),
        operatorEmail: contactEmail || user.email || "",
        subdomain: subdomainSlug,
      });
      // Force page reload to re-check operator status in useAuth
      window.location.href = "/nfstay/settings";
    } catch (err: any) {
      const msg = err?.message || "Failed to create operator account";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast({ title: "Subdomain taken", description: "That subdomain is already in use. Please choose another.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const next = () => setStep(s => Math.min(s + 1, 3));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div data-feature="NFSTAY__OP_ONBOARDING" className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <NfsLogo />
          <span className="text-sm text-muted-foreground">Set up your operator account</span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {/* Step indicators */}
        <div data-feature="NFSTAY__OP_ONBOARDING_STEP" className="flex items-center justify-center gap-2 mb-10">
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

        {/* Step 0: Brand Info */}
        {step === 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground mt-1">This creates your operator profile. You can update these later in Settings.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Brand Name *</Label>
                <Input
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  placeholder="e.g. Sunset Stays"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder={user.email || "hello@company.com"}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+44 20 7946 0958"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Subdomain */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Please add a subdomain</h2>
              <p className="text-sm text-muted-foreground mt-1">Guests will visit this URL to see your properties and book directly.</p>
              <p className="text-xs text-muted-foreground mt-1">You can add your own custom domain later in Settings.</p>
            </div>
            <div>
              <Label>Subdomain *</Label>
              <div className="flex items-center gap-0 mt-1.5">
                <Input
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder="sunset"
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 h-9 border border-l-0 border-border rounded-r-md bg-muted text-sm text-muted-foreground whitespace-nowrap">
                  .nfstay.app
                </span>
              </div>
              {subdomainSlug && (
                <p className="text-xs text-muted-foreground mt-2">
                  Your site: <span className="font-medium text-foreground">{subdomainSlug}.nfstay.app</span>
                </p>
              )}
              {subdomain && subdomainSlug.length < 2 && (
                <p className="text-xs text-destructive mt-1">Subdomain must be at least 2 characters.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold">Pick your brand colour</h2>
              <p className="text-sm text-muted-foreground mt-1">This colour will be used for buttons and accents on your white-label site.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                    accentColor === c.value ? 'border-foreground' : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: c.value }} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </button>
              ))}
            </div>
            <div>
              <Label>Or enter a custom hex</Label>
              <Input
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                placeholder="#22c55e"
                className="mt-1.5 max-w-xs"
              />
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Ready to go!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We'll create your operator account as <strong>{brandName || "your brand"}</strong> at{" "}
              <strong>{subdomainSlug || "___"}.nfstay.app</strong>.
            </p>
            {!canFinish && (
              <p className="text-sm text-destructive">
                Please go back and fill in brand name (step 1) and subdomain (step 2).
              </p>
            )}
            <Button
              onClick={finish}
              disabled={!canFinish || saving}
              className="rounded-lg gap-2"
            >
              {saving ? "Creating..." : "Create my account"}
              {!saving && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button data-feature="NFSTAY__OP_ONBOARDING_BACK" variant="ghost" onClick={prev} disabled={step === 0} className="gap-2 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < 3 && (
            <Button data-feature="NFSTAY__OP_ONBOARDING_NEXT" onClick={next} className="rounded-lg gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
