import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROPERTY_TYPES, RENTAL_TYPES, CANCELLATION_POLICIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

export default function OperatorPropertyForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Property saved", description: "Your property has been created successfully." });
      navigate("/nfstay/properties");
    }, 1000);
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Property</h1>
          <p className="text-sm text-muted-foreground">Fill in the details for your new listing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Property Title</Label>
              <Input id="title" placeholder="e.g., Stunning Marina View Apartment" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="type">Property Type</Label>
              <Select required>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rental">Rental Type</Label>
              <Select required>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{RENTAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" placeholder="Describe your property..." rows={5} className="mt-1.5" required />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>City</Label><Input placeholder="City" className="mt-1.5" required /></div>
            <div><Label>State / Region</Label><Input placeholder="State" className="mt-1.5" /></div>
            <div><Label>Country</Label><Input placeholder="Country" className="mt-1.5" required /></div>
          </div>
        </section>

        {/* Rooms & Capacity */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Rooms & Capacity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Bedrooms</Label><Input type="number" min={0} defaultValue={1} className="mt-1.5" /></div>
            <div><Label>Beds</Label><Input type="number" min={1} defaultValue={1} className="mt-1.5" /></div>
            <div><Label>Bathrooms</Label><Input type="number" min={1} defaultValue={1} className="mt-1.5" /></div>
            <div><Label>Max Guests</Label><Input type="number" min={1} defaultValue={2} className="mt-1.5" /></div>
          </div>
        </section>

        {/* Photos */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Drag and drop photos or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB each. First photo will be the cover.</p>
            <Button variant="outline" className="mt-3 rounded-lg" type="button">Choose Files</Button>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Base Rate (£/night)</Label><Input type="number" min={1} placeholder="100" className="mt-1.5" required /></div>
            <div><Label>Cleaning Fee (£)</Label><Input type="number" min={0} placeholder="0" className="mt-1.5" /></div>
            <div><Label>Minimum Stay (nights)</Label><Input type="number" min={1} defaultValue={1} className="mt-1.5" /></div>
          </div>
        </section>

        {/* Policies */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cancellation Policy</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CANCELLATION_POLICIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} — {v.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>House Rules</Label><Input placeholder="No smoking, no parties..." className="mt-1.5" /></div>
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" className="rounded-lg" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" className="rounded-lg" disabled={saving}>{saving ? "Saving..." : "Create Property"}</Button>
        </div>
      </form>
    </div>
  );
}
