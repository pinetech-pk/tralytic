"use client";

import { Bell, Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/layout/sidebar";
import { usePermissionsContext } from "@/hooks";
import { RoleBadge, type RoleType } from "./role-badge";

interface HeaderProps {
  title: string;
  description?: string;
}

// Map user role + subscription status to badge type
function getBadgeRole(
  role: string,
  isAdmin: boolean,
  subscriptionStatus: string
): RoleType {
  if (role === "super_admin") return "super_admin";
  if (role === "web_admin") return "web_admin";

  // Platform user - badge based on subscription
  if (subscriptionStatus === "active") return "premium";
  if (subscriptionStatus === "expired") return "expired";
  return "trial"; // learning, past_due, cancelled, paused all show as trial
}

export function Header({ title, description }: HeaderProps) {
  const { open, isMobile } = useSidebar();
  const {
    role,
    isAdmin,
    subscriptionStatus,
    daysRemaining,
    loading
  } = usePermissionsContext();

  const badgeRole = getBadgeRole(role, isAdmin, subscriptionStatus);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:h-16 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={open}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Page title */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Mobile: Show app name */}
        {isMobile && (
          <span className="text-lg font-semibold">Tralytic</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search - Hidden on mobile and tablet */}
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search trades, strategies..."
            className="w-64 pl-9"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Role badge - shown on tablet and desktop, hidden while loading */}
        {!isMobile && !loading && (
          <RoleBadge
            role={badgeRole}
            daysRemaining={badgeRole === "trial" ? daysRemaining ?? undefined : undefined}
            compact={false}
          />
        )}

        {/* User button */}
        <Button variant="ghost" size="icon">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4" />
          </div>
        </Button>
      </div>
    </header>
  );
}
