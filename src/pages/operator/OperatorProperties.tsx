import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsPropertyCard } from "@/components/nfs/NfsPropertyCard";
import { mockProperties } from "@/data/mock-properties";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function OperatorProperties() {
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");

  // Operator owns first 6 properties (mock)
  const operatorProps = mockProperties.slice(0, 6);
  const filtered = operatorProps.filter(p =>
    p.public_title.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">{operatorProps.length} properties managed</p>
        </div>
        <Button asChild className="rounded-lg gap-2">
          <Link to="/nfstay/properties/new"><Plus className="w-4 h-4" /> Add Property</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search properties..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button onClick={() => setView("table")} className={`p-2 ${view === "table" ? "bg-secondary" : "hover:bg-secondary/50"}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-secondary" : "hover:bg-secondary/50"}`}><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {view === "table" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="p-4 font-medium text-muted-foreground">Property</th>
                  <th className="p-4 font-medium text-muted-foreground">Type</th>
                  <th className="p-4 font-medium text-muted-foreground">Location</th>
                  <th className="p-4 font-medium text-muted-foreground">Rate/night</th>
                  <th className="p-4 font-medium text-muted-foreground">Status</th>
                  <th className="p-4 font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={p.images.find(i => i.is_cover)?.url || p.images[0]?.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <Link to={`/nfstay/properties/${p.id}`} className="font-medium hover:text-primary transition-colors">{p.public_title}</Link>
                          <p className="text-xs text-muted-foreground">{p.room_counts.bedrooms} bed · {p.room_counts.bathrooms} bath · {p.max_guests} guests</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.property_type}</td>
                    <td className="p-4 text-muted-foreground">{p.city}, {p.country}</td>
                    <td className="p-4 font-medium">{formatPrice(p.base_rate_amount)}</td>
                    <td className="p-4"><NfsStatusBadge status={p.listing_status} /></td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-secondary"><MoreHorizontal className="w-4 h-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link to={`/property/${p.id}`} className="gap-2"><Eye className="w-4 h-4" /> View listing</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to={`/nfstay/properties/${p.id}`} className="gap-2"><Pencil className="w-4 h-4" /> Edit</Link></DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive gap-2"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <NfsPropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
