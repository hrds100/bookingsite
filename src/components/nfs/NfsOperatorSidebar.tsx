import { useEffect } from "react";
import { LayoutDashboard, Building2, CalendarDays, CalendarRange, BarChart3, Settings, Plug, Plus, LogOut, ExternalLink } from "lucide-react";
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
import { getBridgeUrl } from "@/lib/authBridge";

const navItems = [
  { title: "Dashboard", url: "/nfstay", icon: LayoutDashboard },
  { title: "Properties", url: "/nfstay/properties", icon: Building2 },
  { title: "Reservations", url: "/nfstay/reservations", icon: CalendarDays },
  { title: "Calendar", url: "/nfstay/calendar", icon: CalendarRange },
  { title: "Analytics", url: "/nfstay/analytics", icon: BarChart3 },
  { title: "Settings", url: "/nfstay/settings", icon: Settings },
  { title: "Integrations", url: "/nfstay/integrations", icon: Plug },
];

export function NfsOperatorSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" data-feature="NFSTAY__OP_SIDEBAR">
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
                      data-feature={`NFSTAY__OP_SIDEBAR_${item.title.toUpperCase()}`}
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
              <button
                onClick={() => {
                  window.open(getBridgeUrl("https://hub.nfstay.com", "/dashboard/deals"), "_blank");
                }}
                className="hover:bg-sidebar-accent text-muted-foreground w-full text-left flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {!collapsed && <span>Open Hub Dashboard</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/" data-feature="NFSTAY__OP_LOGOUT" className="hover:bg-sidebar-accent text-muted-foreground">
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
