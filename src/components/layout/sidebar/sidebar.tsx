"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  BookOpen,
  Wallet,
  Target,
  Upload,
  Settings,
  TrendingUp,
  LogOut,
  ChevronLeft,
  Users,
  BarChart3,
  CreditCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "./sidebar-context";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const userNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: LineChart },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Strategies", href: "/strategies", icon: Target },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNavigation: NavItem[] = [
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Platform Metrics", href: "/admin/metrics", icon: BarChart3 },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isOpen, isCollapsed, isMobile, isTablet, close, toggle } = useSidebar();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (isMobile) {
      close();
    }
  };

  // Determine if sidebar should show labels
  const showLabels = isMobile || (!isCollapsed && !isTablet);

  // Sidebar width classes
  const sidebarWidth = isMobile
    ? "w-[280px]"
    : isCollapsed || isTablet
    ? "w-[72px]"
    : "w-[256px]";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen flex-col border-r bg-card transition-all duration-300",
          sidebarWidth,
          // Mobile: slide in/out
          isMobile && !isOpen && "-translate-x-full",
          isMobile && isOpen && "translate-x-0"
        )}
        aria-label="Sidebar navigation"
        aria-hidden={isMobile && !isOpen}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={handleNavClick}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            {showLabels && (
              <span className="text-lg font-semibold whitespace-nowrap">
                Tralytic
              </span>
            )}
          </Link>

          {/* Close button (mobile) or Collapse toggle (desktop) */}
          {isMobile ? (
            <button
              onClick={close}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            !isTablet && (
              <button
                onClick={toggle}
                className={cn(
                  "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-transform",
                  isCollapsed && "rotate-180"
                )}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {/* User Navigation */}
          {userNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={pathname.startsWith(item.href)}
              showLabel={showLabels}
              onClick={handleNavClick}
            />
          ))}

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <div className="my-4 border-t" />
              <p
                className={cn(
                  "mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  !showLabels && "sr-only"
                )}
              >
                Admin
              </p>
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={pathname.startsWith(item.href)}
                  showLabel={showLabels}
                  onClick={handleNavClick}
                />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <button
            onClick={handleSignOut}
            title={!showLabels ? "Sign Out" : undefined}
            className={cn(
              "flex w-full items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              showLabels ? "gap-3 px-3 py-2" : "justify-center p-2"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {showLabels && "Sign Out"}
          </button>
        </div>
      </aside>
    </>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  showLabel: boolean;
  onClick?: () => void;
}

function NavLink({ item, isActive, showLabel, onClick }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={!showLabel ? item.name : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        !showLabel && "justify-center",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {showLabel && <span className="whitespace-nowrap">{item.name}</span>}
    </Link>
  );
}
