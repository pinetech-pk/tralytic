"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "super_admin" | "web_admin" | "platform_user";
export type SubscriptionStatus = "learning" | "active" | "past_due" | "cancelled" | "expired" | "paused";

export interface UserPermissions {
  // User info
  user: User | null;
  userId: string | null;
  email: string | null;

  // Role info
  role: UserRole;
  roleName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Subscription info
  subscriptionStatus: SubscriptionStatus;
  isLearningPeriod: boolean;
  isPremium: boolean;
  daysRemaining: number | null;

  // Permissions
  permissions: string[];
  hasPermission: (permission: string) => boolean;

  // Loading state
  loading: boolean;
  error: string | null;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  user: null,
  userId: null,
  email: null,
  role: "platform_user",
  roleName: "Platform User",
  isAdmin: false,
  isSuperAdmin: false,
  subscriptionStatus: "learning",
  isLearningPeriod: true,
  isPremium: false,
  daysRemaining: null,
  permissions: [],
  hasPermission: () => false,
  loading: true,
  error: null,
};

export function usePermissions(): UserPermissions {
  const [state, setState] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function fetchPermissions() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isMounted) {
            setState({
              ...DEFAULT_PERMISSIONS,
              loading: false,
              error: userError?.message || "Not authenticated",
            });
          }
          return;
        }

        // Fetch user's roles with role details
        const { data: userRolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select(`
            role_id,
            roles (
              name,
              display_name,
              is_admin
            )
          `)
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
        }

        // Determine the highest role (super_admin > web_admin > platform_user)
        let role = "platform_user" as UserRole;
        let roleName = "Platform User";
        let isAdmin = false;
        let isSuperAdmin = false;

        if (userRolesData && userRolesData.length > 0) {
          for (const ur of userRolesData) {
            const r = ur.roles;
            if (r) {
              if (r.name === "super_admin") {
                role = "super_admin";
                roleName = r.display_name;
                isAdmin = true;
                isSuperAdmin = true;
                break; // Highest role, no need to check further
              } else if (r.name === "web_admin" && role !== "super_admin") {
                role = "web_admin";
                roleName = r.display_name;
                isAdmin = true;
              } else if (r.name === "platform_user" && !isAdmin) {
                role = "platform_user";
                roleName = r.display_name;
              }
            }
          }
        }

        // Fetch subscription status
        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("status, learning_ends_at")
          .eq("user_id", user.id)
          .single();

        if (subError && subError.code !== "PGRST116") {
          // PGRST116 = no rows found, which is OK for new users
          console.error("Error fetching subscription:", subError);
        }

        let subscriptionStatus: SubscriptionStatus = "learning";
        let isLearningPeriod = true;
        let isPremium = false;
        let daysRemaining: number | null = null;

        if (subscriptionData) {
          const sub = subscriptionData;
          subscriptionStatus = sub.status;
          isLearningPeriod = sub.status === "learning";
          isPremium = sub.status === "active";

          // Calculate days remaining for learning period
          if (isLearningPeriod && sub.learning_ends_at) {
            const endsAt = new Date(sub.learning_ends_at);
            const now = new Date();
            const diff = endsAt.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          }
        }

        // Fetch permissions for user's roles
        const { data: permissionsData, error: permError } = await supabase
          .from("user_roles")
          .select(`
            roles (
              role_permissions (
                permissions (
                  name
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (permError) {
          console.error("Error fetching permissions:", permError);
        }

        // Extract permission names
        const permissions: string[] = [];
        if (permissionsData) {
          for (const ur of permissionsData) {
            const rolesObj = ur.roles;

            if (rolesObj?.role_permissions) {
              for (const rp of rolesObj.role_permissions) {
                if (rp.permissions?.name && !permissions.includes(rp.permissions.name)) {
                  permissions.push(rp.permissions.name);
                }
              }
            }
          }
        }

        const hasPermission = (permission: string): boolean => {
          if (isSuperAdmin) return true; // Super admin has all permissions
          return permissions.includes(permission);
        };

        if (isMounted) {
          setState({
            user,
            userId: user.id,
            email: user.email || null,
            role,
            roleName,
            isAdmin,
            isSuperAdmin,
            subscriptionStatus,
            isLearningPeriod,
            isPremium,
            daysRemaining,
            permissions,
            hasPermission,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error("Error in usePermissions:", err);
        if (isMounted) {
          setState({
            ...DEFAULT_PERMISSIONS,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    fetchPermissions();

    // Listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchPermissions();
        } else {
          setState({
            ...DEFAULT_PERMISSIONS,
            loading: false,
          });
        }
      }
    );

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  return state;
}
