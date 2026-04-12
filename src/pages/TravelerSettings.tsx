import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

function getInitials(email: string, name?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function TravelerSettings() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const userName = (user?.user_metadata?.name as string) || "";
  const userEmail = user?.email || "";

  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [currency, setCurrency] = useState("GBP");
  const [avatarUrl, setAvatarUrl] = useState<string>((user?.user_metadata?.avatar_url as string) || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setName(userName);
  }, [userName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("traveler_settings.profile_saved"));
      }
    } catch {
      toast.error(t("traveler_settings.something_wrong"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError(null);
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordError(t("traveler_settings.passwords_no_match"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("traveler_settings.password_too_short"));
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        toast.success(t("traveler_settings.password_updated"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError(t("traveler_settings.something_wrong"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("nfs-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("nfs-images")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success(t("traveler_settings.photo_updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast(t("traveler_settings.contact_support"));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(userEmail, userName);

  return (
    <div data-feature="NFSTAY__TRAVELER_SETTINGS" className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8 space-y-8">
      <h1 className="text-2xl font-semibold">{t("traveler_settings.page_title")}</h1>

      {/* Profile photo */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || userEmail} />}
          <AvatarFallback className="bg-primary-gradient text-white text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" className="rounded-full" onClick={handlePhotoUpload} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
          {uploading ? t("traveler_settings.uploading") : t("traveler_settings.upload_photo")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <hr className="border-border" />

      {/* Personal info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("traveler_settings.personal_info")}</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">{t("traveler_settings.full_name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              value={userEmail}
              readOnly
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="phone">{t("traveler_settings.phone_number")}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900000"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Password change */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("traveler_settings.change_password")}</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="current-password">{t("traveler_settings.current_password")}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your current password"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-password">{t("traveler_settings.new_password")}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">{t("traveler_settings.confirm_password")}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="mt-1"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handlePasswordSave}
            disabled={passwordSaving || !newPassword}
          >
            {passwordSaving ? t("traveler_settings.updating") : t("traveler_settings.update_password")}
          </Button>
        </div>
      </section>

      <hr className="border-border" />

      {/* Notification preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("traveler_settings.notifications_title")}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("traveler_settings.email_notifications")}</p>
              <p className="text-xs text-muted-foreground">{t("traveler_settings.email_notifications_desc")}</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("traveler_settings.whatsapp_notifications")}</p>
              <p className="text-xs text-muted-foreground">{t("traveler_settings.whatsapp_notifications_desc")}</p>
            </div>
            <Switch
              checked={whatsappNotifications}
              onCheckedChange={setWhatsappNotifications}
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Currency preference */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("traveler_settings.currency_preference")}</h2>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-full max-w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="AED">AED - UAE Dirham</SelectItem>
            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <hr className="border-border" />

      {/* Delete account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("traveler_settings.danger_zone")}</h2>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="rounded-full">
              <Trash2 className="w-4 h-4 mr-2" />
              {t("traveler_settings.delete_account")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("traveler_settings.delete_title")}</DialogTitle>
              <DialogDescription>
                {t("traveler_settings.delete_desc")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                {t("traveler_settings.delete_account")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <hr className="border-border" />

      {/* Save button */}
      <Button
        className="w-full sm:w-auto rounded-full bg-primary-gradient text-white"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? t("common.saving") : t("traveler_settings.save_settings")}
      </Button>
    </div>
  );
}
