import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface ProfileForm {
  brand_name: string;
  legal_name: string;
  first_name: string;
  last_name: string;
  persona_type: string;
}

interface ContactForm {
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_telegram: string;
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
}

interface NotificationsForm {
  email_new_booking: boolean;
  email_cancellation: boolean;
  email_review: boolean;
  sms_new_booking: boolean;
}

const EMPTY_PROFILE: ProfileForm = {
  brand_name: "",
  legal_name: "",
  first_name: "",
  last_name: "",
  persona_type: "",
};

const EMPTY_CONTACT: ContactForm = {
  contact_email: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_telegram: "",
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

  const [saving, setSaving] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync from real operator data — only runs once when data arrives
  useEffect(() => {
    if (operator && !synced) {
      setProfileForm({
        brand_name: operator.brand_name || "",
        legal_name: operator.legal_name || "",
        first_name: operator.first_name || "",
        last_name: operator.last_name || "",
        persona_type: operator.persona_type || "",
      });
      setContactForm({
        contact_email: operator.contact_email || "",
        contact_phone: operator.contact_phone || "",
        contact_whatsapp: operator.contact_whatsapp || "",
        contact_telegram: operator.contact_telegram || "",
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

  const handleSaveProfile = () =>
    saveTab("Profile", {
      brand_name: profileForm.brand_name,
      legal_name: profileForm.legal_name || null,
      first_name: profileForm.first_name || null,
      last_name: profileForm.last_name || null,
      persona_type: profileForm.persona_type || null,
    });

  const handleSaveContact = () =>
    saveTab("Contact", {
      contact_email: contactForm.contact_email || null,
      contact_phone: contactForm.contact_phone || null,
      contact_whatsapp: contactForm.contact_whatsapp || null,
      contact_telegram: contactForm.contact_telegram || null,
    });

  const handleSaveBranding = () =>
    saveTab("Branding", {
      logo_url: brandingForm.logo_url || null,
      accent_color: brandingForm.accent_color,
      hero_headline: brandingForm.hero_headline || null,
      hero_subheadline: brandingForm.hero_subheadline || null,
      about_bio: brandingForm.about_bio || null,
    });

  const handleSaveDomain = () =>
    saveTab("Domain", {
      subdomain: domainForm.subdomain || null,
      custom_domain: domainForm.custom_domain || null,
    });

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

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-6">
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
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} className="rounded-lg" disabled={saving === "Profile"}>
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
                <div className="bg-muted/50 border border-border rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-foreground">DNS setup instructions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1. Add a CNAME record pointing your domain to <span className="font-mono text-foreground">cname.vercel-dns.com</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2. Enter the domain above and save
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

          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">SEO</h2>
            <div className="space-y-4">
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
                  Shown in search results. Keep under 160 characters.
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
      </Tabs>
    </div>
  );
}
