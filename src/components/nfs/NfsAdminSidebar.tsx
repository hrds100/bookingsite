import { useEffect } from "react";
import { LayoutDashboard, Users, ShieldCheck, BarChart3, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import { NfsLogo } from "./NfsLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/admin/nfstay", icon: LayoutDashboard },
  { title: "Users", url: "/admin/nfstay/users", icon: Users },
  { title: "Operators", url: "/admin/nfstay/operators", icon: ShieldCheck },
  { title: "Analytics", url: "/admin/nfstay/analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/nfstay/settings", icon: Settings },
];

export function NfsAdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" data-feature="NFSTAY__ADMIN_SIDEBAR">
      <SidebarHeader className="p-4">
        {collapsed ? (
          <div className="flex justify-center">
            <span className="flex items-center justify-center font-bold leading-none" style={{ width: 24, height: 24, border: '2px solid #0a0a0a', borderRadius: 5, fontFamily: "'Sora', sans-serif", fontSize: 10, color: '#0a0a0a' }}>nf</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NfsLogo />
            <span className="text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">ADMIN</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin/nfstay"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                      data-feature={`NFSTAY__ADMIN_SIDEBAR_${item.title.toUpperCase()}`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/" className="hover:bg-sidebar-accent text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span>Back to site</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
