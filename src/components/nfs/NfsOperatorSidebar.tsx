import { useEffect } from "react";
import { LayoutDashboard, Building2, CalendarDays, BarChart3, Settings, Plus, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { NfsLogo } from "./NfsLogo";
import { useLocation } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const navItems = [
  { title: "Dashboard", url: "/nfstay", icon: LayoutDashboard },
  { title: "Properties", url: "/nfstay/properties", icon: Building2 },
  { title: "Reservations", url: "/nfstay/reservations", icon: CalendarDays },
  { title: "Analytics", url: "/nfstay/analytics", icon: BarChart3 },
  { title: "Settings", url: "/nfstay/settings", icon: Settings },
];

export function NfsOperatorSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {collapsed ? (
          <div className="flex justify-center">
            <span className="text-lg font-bold text-primary">N</span>
          </div>
        ) : (
          <NfsLogo />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/nfstay"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
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

        {!collapsed && (
          <div className="px-4 mt-4">
            <Button asChild size="sm" className="w-full rounded-lg gap-2">
              <Link to="/nfstay/properties/new">
                <Plus className="w-4 h-4" /> Add Property
              </Link>
            </Button>
          </div>
        )}
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
