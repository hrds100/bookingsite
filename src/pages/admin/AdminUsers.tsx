import { useState, useMemo } from "react";
import { Search, MoreHorizontal, UserCheck, UserX, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NfsStatusBadge } from "@/components/nfs/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfs/NfsEmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { AdminUser } from "@/hooks/useAdminUsers";
import { toast } from "@/hooks/use-toast";

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left bg-muted/30">
              <th className="p-4 font-medium text-muted-foreground">User</th>
              <th className="p-4 font-medium text-muted-foreground">Role</th>
              <th className="p-4 font-medium text-muted-foreground">Joined</th>
              <th className="p-4 font-medium text-muted-foreground">Last Active</th>
              <th className="p-4 font-medium text-muted-foreground w-12"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                </td>
                <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                <td className="p-4"><Skeleton className="h-6 w-6 rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserTable({ data, search }: { data: AdminUser[]; search: string }) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left bg-muted/30">
              <th className="p-4 font-medium text-muted-foreground">User</th>
              <th className="p-4 font-medium text-muted-foreground">Role</th>
              <th className="p-4 font-medium text-muted-foreground">Joined</th>
              <th className="p-4 font-medium text-muted-foreground">Last Active</th>
              <th className="p-4 font-medium text-muted-foreground w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.full_name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {u.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <NfsStatusBadge status={u.role} />
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {u.created_at?.split("T")[0] ?? "—"}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {u.last_sign_in?.split("T")[0] ?? "—"}
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-secondary">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() =>
                            toast({ title: "Email sent (mock)" })
                          }
                        >
                          <Mail className="w-4 h-4" /> Send email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive"
                          onClick={() =>
                            toast({
                              title: `${u.full_name} suspended (mock)`,
                            })
                          }
                        >
                          <UserX className="w-4 h-4" /> Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-primary"
                          onClick={() =>
                            toast({
                              title: `${u.full_name} activated (mock)`,
                            })
                          }
                        >
                          <UserCheck className="w-4 h-4" /> Activate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, error } = useAdminUsers();

  const all = useMemo(() => users ?? [], [users]);
  const travelers = useMemo(() => all.filter((u) => u.role === "traveler"), [all]);
  const operators = useMemo(() => all.filter((u) => u.role === "operator"), [all]);
  const admins = useMemo(() => all.filter((u) => u.role === "admin"), [all]);

  if (error) {
    return (
      <div className="p-6 max-w-7xl">
        <NfsEmptyState
          icon={AlertCircle}
          title="Failed to load users"
          description="Something went wrong while fetching user data. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${all.length} registered users`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-lg"
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({all.length})</TabsTrigger>
            <TabsTrigger value="travelers">Travelers ({travelers.length})</TabsTrigger>
            <TabsTrigger value="operators">Operators ({operators.length})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <UserTable data={all} search={search} />
          </TabsContent>
          <TabsContent value="travelers" className="mt-4">
            <UserTable data={travelers} search={search} />
          </TabsContent>
          <TabsContent value="operators" className="mt-4">
            <UserTable data={operators} search={search} />
          </TabsContent>
          <TabsContent value="admins" className="mt-4">
            <UserTable data={admins} search={search} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
