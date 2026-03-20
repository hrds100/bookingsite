import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockOperatorProfile } from "@/data/mock-operator";
import { toast } from "@/hooks/use-toast";

export default function OperatorSettings() {
  const [profile, setProfile] = useState(mockOperatorProfile);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    }, 800);
  };

  const updateNotif = (key: keyof typeof profile.notifications, val: boolean) => {
    setProfile(p => ({ ...p, notifications: { ...p.notifications, [key]: val } }));
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your operator profile, branding, and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Brand Name</Label>
                <Input value={profile.brand_name} onChange={e => setProfile(p => ({ ...p, brand_name: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={profile.contact_email} onChange={e => setProfile(p => ({ ...p, contact_email: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profile.contact_phone} onChange={e => setProfile(p => ({ ...p, contact_phone: e.target.value }))} className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Label>Website</Label>
                <Input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="branding" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">White-Label Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Subdomain</Label>
                <div className="flex items-center mt-1.5">
                  <Input value={profile.subdomain} onChange={e => setProfile(p => ({ ...p, subdomain: e.target.value }))} className="rounded-r-none" />
                  <span className="bg-muted border border-l-0 border-input px-3 h-10 flex items-center text-sm text-muted-foreground rounded-r-md">.nfstay.app</span>
                </div>
              </div>
              <div>
                <Label>Brand Color</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input type="color" value={profile.accent_color} onChange={e => setProfile(p => ({ ...p, accent_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <Input value={profile.accent_color} onChange={e => setProfile(p => ({ ...p, accent_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            <div>
              <Label>Logo</Label>
              <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">Drag and drop your logo or click to upload</p>
                <Button variant="outline" size="sm" className="mt-2 rounded-lg" type="button">Upload Logo</Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="payout" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Payout Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Payout Method</Label>
                <Input value="Stripe Connect" disabled className="mt-1.5 bg-muted" />
              </div>
              <div>
                <Label>Payout Email</Label>
                <Input value={profile.payout_email} onChange={e => setProfile(p => ({ ...p, payout_email: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div className="bg-accent-light border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-primary font-medium">✓ Stripe Connect is active</p>
              <p className="text-xs text-muted-foreground mt-1">Payouts are processed automatically after guest check-out.</p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Notification Preferences</h2>
            {([
              { key: 'email_new_booking' as const, label: 'New booking confirmation', desc: 'Receive an email when a guest books one of your properties.' },
              { key: 'email_cancellation' as const, label: 'Cancellation alerts', desc: 'Get notified when a guest cancels a reservation.' },
              { key: 'email_review' as const, label: 'New review notifications', desc: 'Receive an email when a guest leaves a review.' },
              { key: 'sms_new_booking' as const, label: 'SMS for new bookings', desc: 'Get an SMS when a new booking is confirmed.' },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={profile.notifications[item.key]} onCheckedChange={v => updateNotif(item.key, v)} />
              </div>
            ))}
          </section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="rounded-lg" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
