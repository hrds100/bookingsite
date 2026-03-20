import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockProperties } from "@/data/mock-properties";
import { toast } from "@/hooks/use-toast";

export default function OperatorCreateReservation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Reservation created", description: "The reservation has been added." });
      navigate('/nfstay/reservations');
    }, 800);
  };

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={() => navigate('/nfstay/reservations')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to reservations
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-2">Create Reservation</h1>
      <p className="text-sm text-muted-foreground mb-6">Manually add a reservation for a guest.</p>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <Label>Property</Label>
          <Select>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              {mockProperties.slice(0, 6).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.public_title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Guest First Name</Label><Input placeholder="John" className="mt-1.5" required /></div>
          <div><Label>Guest Last Name</Label><Input placeholder="Doe" className="mt-1.5" required /></div>
          <div><Label>Guest Email</Label><Input type="email" placeholder="john@example.com" className="mt-1.5" required /></div>
          <div><Label>Guest Phone</Label><Input placeholder="+44 7700 900000" className="mt-1.5" /></div>
          <div><Label>Check-in</Label><Input type="date" className="mt-1.5" required /></div>
          <div><Label>Check-out</Label><Input type="date" className="mt-1.5" required /></div>
          <div><Label>Adults</Label><Input type="number" min="1" defaultValue="2" className="mt-1.5" required /></div>
          <div><Label>Children</Label><Input type="number" min="0" defaultValue="0" className="mt-1.5" /></div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => navigate('/nfstay/reservations')}>Cancel</Button>
          <Button type="submit" className="rounded-lg" disabled={loading}>{loading ? 'Creating...' : 'Create Reservation'}</Button>
        </div>
      </form>
    </div>
  );
}
