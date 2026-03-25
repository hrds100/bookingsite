import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setName(userName);
  }, [userName]);

  const handleSave = () => {
    toast.success("Settings saved");
  };

  const handlePhotoUpload = () => {
    toast("Photo upload coming soon");
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast("Contact support to delete your account");
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
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile photo */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarFallback className="bg-primary-gradient text-white text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" className="rounded-full" onClick={handlePhotoUpload}>
          <Camera className="w-4 h-4 mr-2" />
          Upload photo
        </Button>
      </div>

      <hr className="border-border" />

      {/* Personal info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Personal information</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={userEmail}
              readOnly
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone number</Label>
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
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Notification preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Booking confirmations and updates</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">WhatsApp notifications</p>
              <p className="text-xs text-muted-foreground">Receive messages via WhatsApp</p>
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
        <h2 className="text-lg font-semibold">Currency preference</h2>
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
        <h2 className="text-lg font-semibold">Danger zone</h2>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="rounded-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All your data, bookings, and preferences will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete account
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
      >
        Save settings
      </Button>
    </div>
  );
}
