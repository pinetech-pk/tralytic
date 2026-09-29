"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionStatus } from "@/lib/types/database";

interface SubscriptionData {
  id: string;
  user_id: string;
  status: string;
  billing_interval: string | null;
  created_at: string | null;
  current_period_end: string | null;
  amount_cents: number | null;
  is_early_adopter: boolean;
  email: string;
  full_name: string | null;
}

interface BillingStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  learningUsers: number;
  expiredUsers: number;
  monthlyRevenue: number;
  earlyAdopters: number;
}

const SUBSCRIPTIONS_PER_PAGE = 10;

export function BillingContent() {
  const [stats, setStats] = useState<BillingStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    learningUsers: 0,
    expiredUsers: 0,
    monthlyRevenue: 0,
    earlyAdopters: 0,
  });
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    async function fetchBillingData() {
      setLoading(true);
      try {
        // Fetch all subscriptions for stats
        const { data: allSubs } = await supabase
          .from("subscriptions")
          .select("status, amount_cents, is_early_adopter");

        // Calculate stats
        let activeCount = 0;
        let learningCount = 0;
        let expiredCount = 0;
        let monthlyRevenue = 0;
        let earlyAdopterCount = 0;

        if (allSubs) {
          for (const sub of allSubs) {
            if (sub.status === "active") {
              activeCount++;
              monthlyRevenue += sub.amount_cents || 0;
            } else if (sub.status === "learning") {
              learningCount++;
            } else if (sub.status === "expired") {
              expiredCount++;
            }

            if (sub.is_early_adopter) {
              earlyAdopterCount++;
            }
          }
        }

        setStats({
          totalSubscriptions: allSubs?.length || 0,
          activeSubscriptions: activeCount,
          learningUsers: learningCount,
          expiredUsers: expiredCount,
          monthlyRevenue,
          earlyAdopters: earlyAdopterCount,
        });

        // Calculate offset for pagination
        const offset = (currentPage - 1) * SUBSCRIPTIONS_PER_PAGE;

        // Build query for paginated subscriptions
        let query = supabase
          .from("subscriptions")
          .select("*", { count: "exact" });

        if (filterStatus !== "all") {
          query = query.eq("status", filterStatus as SubscriptionStatus);
        }

        const { data: subsData, count } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + SUBSCRIPTIONS_PER_PAGE - 1);

        setTotalSubscriptions(count || 0);

        if (!subsData || subsData.length === 0) {
          setSubscriptions([]);
          return;
        }

        // Fetch user info for each subscription
        const userIds = subsData.map((s) => s.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const profilesMap = new Map<
          string,
          { email: string; full_name: string | null }
        >();
        if (profiles) {
          for (const p of profiles) {
            profilesMap.set(p.id, { email: p.email || "", full_name: p.full_name });
          }
        }

        // Combine data
        const subscriptionData: SubscriptionData[] = subsData.map((sub) => {
          const profile = profilesMap.get(sub.user_id);
          return {
            id: sub.id,
            user_id: sub.user_id,
            status: sub.status,
            billing_interval: sub.billing_interval,
            created_at: sub.created_at,
            current_period_end: sub.current_period_end,
            amount_cents: sub.amount_cents,
            is_early_adopter: sub.is_early_adopter || false,
            email: profile?.email || "Unknown",
            full_name: profile?.full_name || null,
          };
        });

        setSubscriptions(subscriptionData);
      } catch (error) {
        console.error("Error fetching billing data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBillingData();
  }, [currentPage, filterStatus]);

  const totalPages = Math.ceil(totalSubscriptions / SUBSCRIPTIONS_PER_PAGE);

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  function getStatusBadgeVariant(
    status: string
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "active":
        return "default";
      case "learning":
        return "secondary";
      case "expired":
        return "destructive";
      case "cancelled":
        return "destructive";
      case "past_due":
        return "outline";
      default:
        return "outline";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "active":
        return CheckCircle;
      case "learning":
        return Clock;
      case "expired":
        return XCircle;
      case "cancelled":
        return XCircle;
      case "past_due":
        return AlertCircle;
      default:
        return AlertCircle;
    }
  }

  return (
    <>
      <Header
        title="Billing & Subscriptions"
        description="Manage subscriptions and revenue"
      />

      <div className="p-6 space-y-6">
        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(stats.monthlyRevenue)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                From active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Subscriptions
              </CardTitle>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats.activeSubscriptions}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Paying customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Learning Period
              </CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold text-blue-500">
                  {stats.learningUsers}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Free trial users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Early Adopters
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold text-amber-500">
                  {stats.earlyAdopters}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                At $19/mo pricing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Subscriptions ({totalSubscriptions})</CardTitle>
              <select
                className="px-3 py-2 rounded-md border bg-background text-sm w-full sm:w-auto"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="learning">Learning</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="past_due">Past Due</option>
              </select>
            </div>
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
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subscriptions found
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header - Desktop */}
                <div className="hidden lg:grid lg:grid-cols-6 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                  <div>User</div>
                  <div>Status</div>
                  <div>Plan</div>
                  <div>Price</div>
                  <div>Started</div>
                  <div>Renews</div>
                </div>

                {/* Table Rows */}
                {subscriptions.map((sub) => {
                  const StatusIcon = getStatusIcon(sub.status);
                  return (
                    <div
                      key={sub.id}
                      className="grid grid-cols-1 lg:grid-cols-6 gap-4 px-4 py-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* User */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {sub.full_name || "No name"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {sub.email}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(sub.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {sub.status}
                        </Badge>
                        {sub.is_early_adopter && (
                          <Badge
                            variant="outline"
                            className="text-amber-500 border-amber-500"
                          >
                            Early
                          </Badge>
                        )}
                      </div>

                      {/* Plan */}
                      <div className="flex items-center text-sm">
                        {sub.billing_interval || "—"}
                      </div>

                      {/* Price */}
                      <div className="flex items-center text-sm font-medium">
                        {sub.amount_cents
                          ? `${formatCurrency(sub.amount_cents)}/${
                              sub.billing_interval === "year" ? "yr" : "mo"
                            }`
                          : "—"}
                      </div>

                      {/* Started */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString()
                          : "—"}
                      </div>

                      {/* Renews */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        {sub.current_period_end
                          ? new Date(
                              sub.current_period_end
                            ).toLocaleDateString()
                          : "—"}
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
