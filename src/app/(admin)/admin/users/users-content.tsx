"use client";

import { useEffect, useState } from "react";
import {
  Search,
  MoreVertical,
  ShieldCheck,
  User,
  Crown,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
  role_display_name: string;
  is_admin: boolean;
  subscription_status: string | null;
}

const USERS_PER_PAGE = 10;

export function UsersContent() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        // Calculate offset
        const offset = (currentPage - 1) * USERS_PER_PAGE;

        // First, get total count
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        setTotalUsers(count || 0);

        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + USERS_PER_PAGE - 1);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          return;
        }

        if (!profiles || profiles.length === 0) {
          setUsers([]);
          return;
        }

        // Fetch roles for each user
        const userIds = profiles.map((p) => p.id);

        const { data: userRolesData } = await supabase
          .from("user_roles")
          .select(
            `
            user_id,
            roles (
              name,
              display_name,
              is_admin
            )
          `
          )
          .in("user_id", userIds)
          .eq("is_active", true);

        // Fetch subscriptions for each user
        const { data: subscriptionsData } = await supabase
          .from("subscriptions")
          .select("user_id, status")
          .in("user_id", userIds);

        // Build user data map
        const rolesMap = new Map<
          string,
          { name: string; display_name: string; is_admin: boolean | null }
        >();
        if (userRolesData) {
          for (const ur of userRolesData) {
            if (ur.roles) {
              const currentRole = rolesMap.get(ur.user_id);
              // Keep highest role
              if (
                !currentRole ||
                ur.roles.name === "super_admin" ||
                (ur.roles.name === "web_admin" &&
                  currentRole.name !== "super_admin")
              ) {
                rolesMap.set(ur.user_id, ur.roles);
              }
            }
          }
        }

        const subscriptionsMap = new Map<string, string>();
        if (subscriptionsData) {
          for (const sub of subscriptionsData) {
            subscriptionsMap.set(sub.user_id, sub.status);
          }
        }

        // Combine data
        const userData: UserData[] = profiles.map((profile) => {
          const role = rolesMap.get(profile.id);
          return {
            id: profile.id,
            email: profile.email || "",
            full_name: profile.full_name,
            created_at: profile.created_at,
            role: role?.name || "platform_user",
            role_display_name: role?.display_name || "Platform User",
            is_admin: role?.is_admin || false,
            subscription_status: subscriptionsMap.get(profile.id) || null,
          };
        });

        // Apply search filter
        let filteredUsers = userData;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredUsers = filteredUsers.filter(
            (u) =>
              u.email.toLowerCase().includes(query) ||
              u.full_name?.toLowerCase().includes(query)
          );
        }

        // Apply role filter
        if (filterRole !== "all") {
          filteredUsers = filteredUsers.filter((u) => u.role === filterRole);
        }

        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [currentPage, searchQuery, filterRole]);

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  function getRoleBadgeVariant(
    role: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "web_admin":
        return "default";
      default:
        return "secondary";
    }
  }

  function getSubscriptionBadgeVariant(
    status: string | null
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "active":
        return "default";
      case "learning":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case "super_admin":
        return Crown;
      case "web_admin":
        return ShieldCheck;
      default:
        return User;
    }
  }

  return (
    <>
      <Header
        title="User Management"
        description="View and manage platform users"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by email or name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 rounded-md border bg-background text-sm"
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="web_admin">Web Admin</option>
                  <option value="platform_user">Platform User</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Users ({totalUsers})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                  <div>User</div>
                  <div>Role</div>
                  <div>Subscription</div>
                  <div>Joined</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows */}
                {users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <div
                      key={user.id}
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 px-4 py-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.full_name || "No name"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Role */}
                      <div className="flex items-center">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role_display_name}
                        </Badge>
                      </div>

                      {/* Subscription */}
                      <div className="flex items-center">
                        <Badge
                          variant={getSubscriptionBadgeVariant(
                            user.subscription_status
                          )}
                        >
                          {user.subscription_status || "No subscription"}
                        </Badge>
                      </div>

                      {/* Joined Date */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
