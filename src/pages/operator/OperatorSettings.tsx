import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useNfsOperator, useNfsOperatorUpdate } from "@/hooks/useNfsOperator";
import { useNfsOperatorLegalPage, useNfsOperatorLegalPageUpdate, type LegalPageType } from "@/hooks/useNfsLegalPage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface ProfileForm {
  brand_name: string;
  legal_name: string;
  first_name: string;
  last_name: string;
  persona_type: string;
  booking_mode: string;
}

interface ContactForm {
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_telegram: string;
  whatsapp_prefill_message: string;
}

interface BrandingForm {
  logo_url: string;
  accent_color: string;
  hero_headline: string;
  hero_subheadline: string;
  about_bio: string;
}

interface DomainForm {
  subdomain: string;
  custom_domain: string;
}

interface SocialForm {
  google_business_url: string;
  airbnb_url: string;
  social_twitter: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_youtube: string;
}

interface AnalyticsForm {
  google_analytics_id: string;
  meta_pixel_id: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  favicon_url: string;
}

interface NotificationsForm {
  email_new_booking: boolean;
  email_cancellation: boolean;
  email_review: boolean;
  sms_new_booking: boolean;
}

interface PreferencesForm {
  default_currency: string;
  default_language: string;
  accept_cash_booking: boolean;
}

const EMPTY_PROFILE: ProfileForm = {
  brand_name: "",
  legal_name: "",
  first_name: "",
  last_name: "",
  persona_type: "",
  booking_mode: "instant",
};

const EMPTY_CONTACT: ContactForm = {
  contact_email: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_telegram: "",
  whatsapp_prefill_message: "",
};

const EMPTY_BRANDING: BrandingForm = {
  logo_url: "",
  accent_color: "#22c55e",
  hero_headline: "",
  hero_subheadline: "",
  about_bio: "",
};

const EMPTY_DOMAIN: DomainForm = {
  subdomain: "",
  custom_domain: "",
};

const EMPTY_SOCIAL: SocialForm = {
  google_business_url: "",
  airbnb_url: "",
  social_twitter: "",
  social_instagram: "",
  social_facebook: "",
  social_tiktok: "",
  social_youtube: "",
};

const EMPTY_ANALYTICS: AnalyticsForm = {
  google_analytics_id: "",
  meta_pixel_id: "",
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  favicon_url: "",
};

const EMPTY_PREFERENCES: PreferencesForm = {
  default_currency: 'GBP',
  default_language: 'en',
  accept_cash_booking: false,
};

const EMPTY_NOTIFICATIONS: NotificationsForm = {
  email_new_booking: true,
  email_cancellation: true,
  email_review: false,
  sms_new_booking: true,
};

export default function OperatorSettings() {
  const { data: operator } = useNfsOperator();
  const { operatorId } = useAuth();
  const updateOperator = useNfsOperatorUpdate();

  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);
  const [brandingForm, setBrandingForm] = useState<BrandingForm>(EMPTY_BRANDING);
  const [domainForm, setDomainForm] = useState<DomainForm>(EMPTY_DOMAIN);
  const [socialForm, setSocialForm] = useState<SocialForm>(EMPTY_SOCIAL);
  const [analyticsForm, setAnalyticsForm] = useState<AnalyticsForm>(EMPTY_ANALYTICS);
  const [notificationsForm, setNotificationsForm] = useState<NotificationsForm>(EMPTY_NOTIFICATIONS);
  const [preferencesForm, setPreferencesForm] = useState<PreferencesForm>(EMPTY_PREFERENCES);

  const [saving, setSaving] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // OG image + favicon upload state
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Sync from real operator data — only runs once when data arrives
  useEffect(() => {
    if (operator && !synced) {
      setProfileForm({
        brand_name: operator.brand_name || "",
        legal_name: operator.legal_name || "",
        first_name: operator.first_name || "",
        last_name: operator.last_name || "",
        persona_type: operator.persona_type || "",
        booking_mode: operator.booking_mode || "instant",
      });
      setContactForm({
        contact_email: operator.contact_email || "",
        contact_phone: operator.contact_phone || "",
        contact_whatsapp: operator.contact_whatsapp || "",
        contact_telegram: operator.contact_telegram || "",
        whatsapp_prefill_message: operator.whatsapp_prefill_message || "",
      });
      setBrandingForm({
        logo_url: operator.logo_url || "",
        accent_color: operator.accent_color || "#22c55e",
        hero_headline: operator.hero_headline || "",
        hero_subheadline: operator.hero_subheadline || "",
        about_bio: operator.about_bio || "",
      });
      setDomainForm({
        subdomain: operator.subdomain || "",
        custom_domain: operator.custom_domain || "",
      });
      setSocialForm({
        google_business_url: operator.google_business_url || "",
        airbnb_url: operator.airbnb_url || "",
        social_twitter: operator.social_twitter || "",
        social_instagram: operator.social_instagram || "",
        social_facebook: operator.social_facebook || "",
        social_tiktok: operator.social_tiktok || "",
        social_youtube: operator.social_youtube || "",
      });
      setAnalyticsForm({
        google_analytics_id: operator.google_analytics_id || "",
        meta_pixel_id: operator.meta_pixel_id || "",
        meta_title: operator.meta_title || "",
        meta_description: operator.meta_description || "",
        og_image_url: operator.og_image_url || "",
        favicon_url: operator.favicon_url || "",
      });
      setPreferencesForm({
        default_currency: operator.default_currency || 'GBP',
        default_language: operator.default_language || 'en',
        accept_cash_booking: operator.accept_cash_booking ?? false,
      });
      setSynced(true);
    }
  }, [operator, synced]);

  const saveTab = async (tabName: string, fields: Record<string, unknown>) => {
    setSaving(tabName);
    try {
      await updateOperator.mutateAsync(fields as Partial<typeof operator & Record<string, unknown>>);
      toast({ title: "Settings saved", description: `${tabName} settings have been saved.` });
    } catch {
      toast({ title: "Error saving", description: "Could not save settings. Please try again.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleSavePreferences = () =>
    saveTab("Preferences", {
      default_currency: preferencesForm.default_currency,
      default_language: preferencesForm.default_language,
      accept_cash_booking: preferencesForm.accept_cash_booking,
    });

  const handleSaveProfile = () =>
    saveTab("Profile", {
      brand_name: profileForm.brand_name,
      legal_name: profileForm.legal_name || null,
      first_name: profileForm.first_name || null,
      last_name: profileForm.last_name || null,
      persona_type: profileForm.persona_type || null,
      booking_mode: profileForm.booking_mode || "instant",
    });

  const handleSaveContact = () =>
    saveTab("Contact", {
      contact_email: contactForm.contact_email || null,
      contact_phone: contactForm.contact_phone || null,
      contact_whatsapp: contactForm.contact_whatsapp || null,
      contact_telegram: contactForm.contact_telegram || null,
      whatsapp_prefill_message: contactForm.whatsapp_prefill_message || null,
    });

  const handleSaveBranding = () =>
    saveTab("Branding", {
      logo_url: brandingForm.logo_url || null,
      accent_color: brandingForm.accent_color,
      hero_headline: brandingForm.hero_headline || null,
      hero_subheadline: brandingForm.hero_subheadline || null,
      about_bio: brandingForm.about_bio || null,
    });

  const handleSaveDomain = async () => {
    await saveTab("Domain", {
      subdomain: domainForm.subdomain || null,
      custom_domain: domainForm.custom_domain || null,
    });

    // Auto-provision the custom domain in Vercel
    if (domainForm.custom_domain) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfs-vercel-domain`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: domainForm.custom_domain, operatorId }),
          }
        );
        const data = await res.json();
        if (data.success) {
          setDomainVerified(data.verified ?? false);
          if (!data.verified) {
            toast({
              title: "Domain added to Vercel",
              description: "DNS is propagating — this can take a few minutes. Reload to recheck.",
            });
          } else {
            toast({ title: "Domain verified", description: `${domainForm.custom_domain} is live.` });
          }
        } else {
          toast({
            title: "Vercel provisioning failed",
            description: data.error ?? "Could not add domain to Vercel. Try again.",
            variant: "destructive",
          });
        }
      } catch {
        // Non-blocking — DB save already succeeded
      }
    }
  };

  const handleSaveSocial = () =>
    saveTab("Social", {
      google_business_url: socialForm.google_business_url || null,
      airbnb_url: socialForm.airbnb_url || null,
      social_twitter: socialForm.social_twitter || null,
      social_instagram: socialForm.social_instagram || null,
      social_facebook: socialForm.social_facebook || null,
      social_tiktok: socialForm.social_tiktok || null,
      social_youtube: socialForm.social_youtube || null,
    });

  const handleSaveAnalytics = () =>
    saveTab("Analytics & SEO", {
      google_analytics_id: analyticsForm.google_analytics_id || null,
      meta_pixel_id: analyticsForm.meta_pixel_id || null,
      meta_title: analyticsForm.meta_title || null,
      meta_description: analyticsForm.meta_description || null,
      og_image_url: analyticsForm.og_image_url || null,
      favicon_url: analyticsForm.favicon_url || null,
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!operatorId) {
      toast({ title: "Error", description: "Operator ID not found.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const path = `${operatorId}/logo/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("nfs-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("nfs-images")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      // Save to operator record
      await updateOperator.mutateAsync({ logo_url: publicUrl });
      setBrandingForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast({ title: "Logo uploaded", description: "Your logo has been saved." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      // Reset file input so re-selecting same file triggers change
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !operatorId) return;
    setUploadingOgImage(true);
    try {
      const path = `${operatorId}/og/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("nfs-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("nfs-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await updateOperator.mutateAsync({ og_image_url: publicUrl });
      setAnalyticsForm(prev => ({ ...prev, og_image_url: publicUrl }));
      toast({ title: "OG image uploaded", description: "Your sharing image has been saved." });
    } catch (err) {
      toast({ title: "Upload error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    } finally {
      setUploadingOgImage(false);
      if (ogImageInputRef.current) ogImageInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !operatorId) return;
    setUploadingFavicon(true);
    try {
      const path = `${operatorId}/favicon/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("nfs-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("nfs-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await updateOperator.mutateAsync({ favicon_url: publicUrl });
      setAnalyticsForm(prev => ({ ...prev, favicon_url: publicUrl }));
      toast({ title: "Favicon uploaded", description: "Your favicon has been saved." });
    } catch (err) {
      toast({ title: "Upload error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  return (
    <div data-feature="NFSTAY__OP_SETTINGS" className="p-4 sm:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your operator profile, branding, and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="domain">Domain</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="legal">Legal Pages</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Brand Name *</Label>
                <Input
                  value={profileForm.brand_name}
                  onChange={e => setProfileForm(p => ({ ...p, brand_name: e.target.value }))}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label>Legal Name</Label>
                <Input
                  value={profileForm.legal_name}
                  onChange={e => setProfileForm(p => ({ ...p, legal_name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={profileForm.persona_type}
                  onValueChange={v => setProfileForm(p => ({ ...p, persona_type: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>First Name</Label>
                <Input
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Booking Acceptance</h2>
            <p className="text-sm text-muted-foreground">Choose how new bookings are handled for your properties.</p>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${profileForm.booking_mode === 'instant' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input
                  type="radio"
                  name="booking_mode"
                  value="instant"
                  checked={profileForm.booking_mode === 'instant'}
                  onChange={() => setProfileForm(p => ({ ...p, booking_mode: 'instant' }))}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">Instant booking</p>
                  <p className="text-xs text-muted-foreground">Reservations are automatically confirmed after payment.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${profileForm.booking_mode === 'request' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input
                  type="radio"
                  name="booking_mode"
                  value="request"
                  checked={profileForm.booking_mode === 'request'}
                  onChange={() => setProfileForm(p => ({ ...p, booking_mode: 'request' }))}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">Request to book</p>
                  <p className="text-xs text-muted-foreground">You manually approve or reject each booking request.</p>
                </div>
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <Button data-feature="NFSTAY__OP_SETTINGS_SAVE" onClick={handleSaveProfile} className="rounded-lg" disabled={saving === "Profile"}>
              {saving === "Profile" ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Contact */}
        <TabsContent value="contact" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactForm.contact_email}
                  onChange={e => setContactForm(p => ({ ...p, contact_email: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={contactForm.contact_phone}
                  onChange={e => setContactForm(p => ({ ...p, contact_phone: e.target.value }))}
                  className="mt-1.5"
                  placeholder="+44 20 1234 5678"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={contactForm.contact_whatsapp}
                  onChange={e => setContactForm(p => ({ ...p, contact_whatsapp: e.target.value }))}
                  className="mt-1.5"
                  placeholder="+44 7700 900000"
                />
              </div>
              <div>
                <Label>Telegram</Label>
                <Input
                  value={contactForm.contact_telegram}
                  onChange={e => setContactForm(p => ({ ...p, contact_telegram: e.target.value }))}
                  className="mt-1.5"
                  placeholder="@username"
                />
              </div>
              <div className="md:col-span-2">
                <Label>WhatsApp Pre-filled Message</Label>
                <Textarea
                  value={contactForm.whatsapp_prefill_message}
                  onChange={e => setContactForm(p => ({ ...p, whatsapp_prefill_message: e.target.value }))}
                  className="mt-1.5"
                  rows={3}
                  placeholder={`Hi ${contactForm.contact_whatsapp ? "us" : "[your brand name]"}, I have a question about your properties.`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This message is pre-filled when guests tap the WhatsApp button on your site. Leave blank to use the default.
                </p>
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSaveContact} className="rounded-lg" disabled={saving === "Contact"}>
              {saving === "Contact" ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 3: Branding */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Logo</h2>
            <div>
              {brandingForm.logo_url ? (
                <div className="flex items-center gap-4">
                  <img
                    src={brandingForm.logo_url}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain border border-border rounded-lg"
                  />
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        "Change Logo"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or SVG recommended</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">Upload your brand logo</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-lg"
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      "Upload Logo"
                    )}
                  </Button>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Brand Color</h2>
            <div>
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="color"
                  value={brandingForm.accent_color}
                  onChange={e => setBrandingForm(p => ({ ...p, accent_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={brandingForm.accent_color}
                  onChange={e => setBrandingForm(p => ({ ...p, accent_color: e.target.value }))}
                  className="flex-1"
                  placeholder="#22c55e"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <Label>Headline</Label>
                <Input
                  value={brandingForm.hero_headline}
                  onChange={e => setBrandingForm(p => ({ ...p, hero_headline: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Welcome to our vacation rentals"
                />
              </div>
              <div>
                <Label>Subheadline</Label>
                <Input
                  value={brandingForm.hero_subheadline}
                  onChange={e => setBrandingForm(p => ({ ...p, hero_subheadline: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Find your perfect stay"
                />
              </div>
              <div>
                <Label>About Bio</Label>
                <Textarea
                  value={brandingForm.about_bio}
                  onChange={e => setBrandingForm(p => ({ ...p, about_bio: e.target.value }))}
                  className="mt-1.5"
                  rows={4}
                  placeholder="Tell guests about your brand and properties..."
                />
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSaveBranding} className="rounded-lg" disabled={saving === "Branding"}>
              {saving === "Branding" ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 4: Domain */}
        <TabsContent value="domain" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Domain Settings</h2>
            <div className="space-y-4">
              <div>
                <Label>Subdomain</Label>
                <div className="flex items-center mt-1.5">
                  <Input
                    value={domainForm.subdomain}
                    onChange={e => setDomainForm(p => ({ ...p, subdomain: e.target.value }))}
                    className="rounded-r-none"
                    placeholder="yourname"
                  />
                  <span className="bg-muted border border-l-0 border-input px-3 h-10 flex items-center text-sm text-muted-foreground rounded-r-md whitespace-nowrap">
                    .nfstay.app
                  </span>
                </div>
              </div>
              <div>
                <Label>Custom Domain</Label>
                <Input
                  value={domainForm.custom_domain}
                  onChange={e => setDomainForm(p => ({ ...p, custom_domain: e.target.value }))}
                  placeholder="stays.yourcompany.com"
                  className="mt-1.5"
                />
                {domainVerified !== null && (
                  <p className={`text-xs mt-1.5 font-medium ${domainVerified ? "text-primary" : "text-warning"}`}>
                    {domainVerified ? "✓ Domain verified and live" : "⏳ Verification pending — DNS may take a few minutes to propagate"}
                  </p>
                )}
                <div className="bg-muted/50 border border-border rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-foreground">DNS setup instructions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1. Add a CNAME record pointing your domain to <span className="font-mono text-foreground">cname.vercel-dns.com</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2. Enter the domain above and save — Vercel provisioning happens automatically
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3. SSL will be provisioned automatically within a few minutes
                  </p>
                </div>
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSaveDomain} className="rounded-lg" disabled={saving === "Domain"}>
              {saving === "Domain" ? "Saving..." : "Save Domain"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 5: Social Links */}
        <TabsContent value="social" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Listing Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Google Business URL</Label>
                <Input
                  value={socialForm.google_business_url}
                  onChange={e => setSocialForm(p => ({ ...p, google_business_url: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://g.page/your-business"
                />
              </div>
              <div>
                <Label>Airbnb URL</Label>
                <Input
                  value={socialForm.airbnb_url}
                  onChange={e => setSocialForm(p => ({ ...p, airbnb_url: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://airbnb.com/users/show/..."
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Social Media</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Instagram</Label>
                <Input
                  value={socialForm.social_instagram}
                  onChange={e => setSocialForm(p => ({ ...p, social_instagram: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input
                  value={socialForm.social_facebook}
                  onChange={e => setSocialForm(p => ({ ...p, social_facebook: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <Label>Twitter / X</Label>
                <Input
                  value={socialForm.social_twitter}
                  onChange={e => setSocialForm(p => ({ ...p, social_twitter: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://x.com/yourhandle"
                />
              </div>
              <div>
                <Label>TikTok</Label>
                <Input
                  value={socialForm.social_tiktok}
                  onChange={e => setSocialForm(p => ({ ...p, social_tiktok: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://tiktok.com/@yourhandle"
                />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input
                  value={socialForm.social_youtube}
                  onChange={e => setSocialForm(p => ({ ...p, social_youtube: e.target.value }))}
                  className="mt-1.5"
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSaveSocial} className="rounded-lg" disabled={saving === "Social"}>
              {saving === "Social" ? "Saving..." : "Save Social Links"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 6: Analytics & SEO */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Google Analytics ID</Label>
                <Input
                  value={analyticsForm.google_analytics_id}
                  onChange={e => setAnalyticsForm(p => ({ ...p, google_analytics_id: e.target.value }))}
                  className="mt-1.5"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <Label>Meta Pixel ID</Label>
                <Input
                  value={analyticsForm.meta_pixel_id}
                  onChange={e => setAnalyticsForm(p => ({ ...p, meta_pixel_id: e.target.value }))}
                  className="mt-1.5"
                  placeholder="123456789012345"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">SEO & Sharing</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Controls how your site appears in search results and when shared on social media.</p>
            </div>
            <div className="space-y-5">
              {/* OG Image */}
              <div>
                <Label>Social Share Image (OG Image)</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Shown when your site URL is shared on WhatsApp, Telegram, Twitter, etc. Recommended: 1200×630px.
                </p>
                {analyticsForm.og_image_url && (
                  <div className="relative mb-2 w-full max-w-sm">
                    <img src={analyticsForm.og_image_url} alt="OG preview" className="w-full rounded-lg border border-border object-cover aspect-[1200/630]" />
                    <button
                      type="button"
                      onClick={() => { setAnalyticsForm(p => ({ ...p, og_image_url: "" })); updateOperator.mutateAsync({ og_image_url: null }); }}
                      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded hover:bg-black/80"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input ref={ogImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleOgImageUpload} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={uploadingOgImage}
                  onClick={() => ogImageInputRef.current?.click()}
                >
                  {uploadingOgImage ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</> : analyticsForm.og_image_url ? "Replace image" : "Upload image"}
                </Button>
              </div>

              {/* Favicon */}
              <div>
                <Label>Favicon</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Shown in browser tabs and bookmarks. Use a square PNG or ICO, at least 32×32px.
                </p>
                {analyticsForm.favicon_url && (
                  <div className="flex items-center gap-3 mb-2">
                    <img src={analyticsForm.favicon_url} alt="Favicon preview" className="w-8 h-8 rounded border border-border object-contain" />
                    <button
                      type="button"
                      onClick={() => { setAnalyticsForm(p => ({ ...p, favicon_url: "" })); updateOperator.mutateAsync({ favicon_url: null }); }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={uploadingFavicon}
                  onClick={() => faviconInputRef.current?.click()}
                >
                  {uploadingFavicon ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</> : analyticsForm.favicon_url ? "Replace favicon" : "Upload favicon"}
                </Button>
              </div>

              {/* Page title */}
              <div>
                <Label>Page Title</Label>
                <Input
                  value={analyticsForm.meta_title}
                  onChange={e => setAnalyticsForm(p => ({ ...p, meta_title: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Your Brand — Vacation Rentals"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown in browser tabs and search results. Keep under 60 characters.
                </p>
              </div>

              {/* Meta description */}
              <div>
                <Label>Meta Description</Label>
                <Textarea
                  value={analyticsForm.meta_description}
                  onChange={e => setAnalyticsForm(p => ({ ...p, meta_description: e.target.value }))}
                  className="mt-1.5"
                  rows={3}
                  placeholder="Book unique vacation rentals with..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown in search results and social share previews. Keep under 160 characters.
                </p>
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSaveAnalytics} className="rounded-lg" disabled={saving === "Analytics & SEO"}>
              {saving === "Analytics & SEO" ? "Saving..." : "Save Analytics & SEO"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 7: Payout */}
        <TabsContent value="payout" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Payout Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Payout Method</Label>
                <Input value="Stripe Connect" disabled className="mt-1.5 bg-muted" />
              </div>
            </div>
            <div className="bg-primary rounded-xl p-4">
              <p className="text-sm text-primary-foreground font-medium">Stripe Connect setup</p>
              <p className="text-xs text-primary-foreground/80 mt-1">Connect your Stripe account to receive payouts from guest bookings.</p>
              <Button
                variant="secondary"
                className="mt-3 rounded-lg"
                onClick={() => toast({ title: "Coming soon", description: "Stripe Connect integration coming soon." })}
              >
                Connect Stripe
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* Tab 8: Notifications */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Notification Preferences</h2>
            {([
              { key: "email_new_booking" as const, label: "New booking confirmation", desc: "Receive an email when a guest books one of your properties." },
              { key: "email_cancellation" as const, label: "Cancellation alerts", desc: "Get notified when a guest cancels a reservation." },
              { key: "email_review" as const, label: "New review notifications", desc: "Receive an email when a guest leaves a review." },
              { key: "sms_new_booking" as const, label: "SMS for new bookings", desc: "Get an SMS when a new booking is confirmed." },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notificationsForm[item.key]}
                  onCheckedChange={v => setNotificationsForm(p => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </section>
        </TabsContent>

        {/* Tab: Legal Pages */}
        <TabsContent value="legal" className="mt-6">
          <LegalPagesTab />
        </TabsContent>

        {/* Tab: Preferences */}
        <TabsContent value="preferences" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Site Defaults</h2>
            <p className="text-sm text-muted-foreground -mt-2">These defaults apply when visitors first land on your site.</p>

            <div>
              <Label>Default Currency</Label>
              <Select
                value={preferencesForm.default_currency}
                onValueChange={v => setPreferencesForm(p => ({ ...p, default_currency: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { code: 'GBP', label: '£ GBP — British Pound' },
                    { code: 'USD', label: '$ USD — US Dollar' },
                    { code: 'EUR', label: '€ EUR — Euro' },
                    { code: 'AED', label: 'د.إ AED — UAE Dirham' },
                    { code: 'SGD', label: 'S$ SGD — Singapore Dollar' },
                    { code: 'BRL', label: 'R$ BRL — Brazilian Real' },
                  ].map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Default Language</Label>
              <Select
                value={preferencesForm.default_language}
                onValueChange={v => setPreferencesForm(p => ({ ...p, default_language: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="ar">🇦🇪 العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Booking Options</h2>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Accept cash / pay on arrival</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show a "Book &amp; Pay at Property" option on your property pages. Guests can reserve without paying online.
                </p>
              </div>
              <Switch
                checked={preferencesForm.accept_cash_booking}
                onCheckedChange={v => setPreferencesForm(p => ({ ...p, accept_cash_booking: v }))}
              />
            </div>
          </section>

          <Button onClick={handleSavePreferences} disabled={saving === "Preferences"}>
            {saving === "Preferences" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Preferences"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Isolated sub-component so hooks run per page type cleanly */
function LegalPagesTab() {
  const { data: operator } = useNfsOperator();

  // Resolve the operator's own site base URL for preview links
  const baseUrl = (() => {
    if (operator?.custom_domain) return `https://${operator.custom_domain}`;
    if (operator?.subdomain) return `https://${operator.subdomain}.nfstay.app`;
    return "";
  })();

  return (
    <div className="space-y-8">
      <LegalPageEditor pageType="privacy" label="Privacy Policy" path="/privacy" baseUrl={baseUrl} />
      <LegalPageEditor pageType="terms" label="Terms & Conditions" path="/terms" baseUrl={baseUrl} />
      <LegalPageEditor pageType="cookie" label="Cookie Policy" path="/cookie-policy" baseUrl={baseUrl} />
    </div>
  );
}

function LegalPageEditor({ pageType, label, path, baseUrl }: { pageType: LegalPageType; label: string; path: string; baseUrl: string }) {
  const { data: savedContent = "", isLoading } = useNfsOperatorLegalPage(pageType);
  const updateLegal = useNfsOperatorLegalPageUpdate();
  const [draft, setDraft] = useState("");
  const [initialised, setInitialised] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate draft once saved content loads
  useEffect(() => {
    if (!isLoading && !initialised) {
      setDraft(savedContent);
      setInitialised(true);
    }
  }, [isLoading, savedContent, initialised]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateLegal.mutateAsync({ pageType, content: draft });
      toast({ title: "Saved", description: `${label} has been saved.` });
    } catch {
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [updateLegal, pageType, draft, label]);

  const handleReset = useCallback(() => {
    setDraft("");
  }, []);

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit your {label.toLowerCase()} content. Leave blank to use the nfstay default.{" "}
            {baseUrl ? (
              <a href={`${baseUrl}${path}`} target="_blank" rel="noreferrer" className="text-primary underline">
                Preview page ↗
              </a>
            ) : (
              <span className="text-muted-foreground/60">Set a subdomain or custom domain to preview.</span>
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
      ) : (
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={16}
          placeholder={`Enter your ${label} content in Markdown format, or leave blank to use the nfstay default template.`}
          className="font-mono text-xs"
        />
      )}

      <p className="text-xs text-muted-foreground">
        Content is formatted as Markdown. Use ## for headings, **bold**, - for bullet points.
      </p>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving || isLoading} size="sm">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={saving}
        >
          Reset to default
        </Button>
      </div>
    </section>
  );
}
