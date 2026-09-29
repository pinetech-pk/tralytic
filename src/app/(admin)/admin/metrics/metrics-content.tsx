"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Activity,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { PlatformMetrics } from "@/lib/types/database";

interface MetricData {
  metric_date: string;
  total_users: number;
  active_subscriptions: number;
  learning_users: number;
  premium_users: number;
  early_adopter_slots_remaining: number;
  mrr_cents: number;
  conversion_rate: number;
}

// platform_metrics stores totals only; "active" and conversion rate are derived.
function toMetricData(row: PlatformMetrics): MetricData {
  const totalUsers = row.total_users ?? 0;
  const learningUsers = row.total_learning ?? 0;
  const premiumUsers = row.total_premium ?? 0;

  return {
    metric_date: row.metric_date,
    total_users: totalUsers,
    learning_users: learningUsers,
    premium_users: premiumUsers,
    active_subscriptions: learningUsers + premiumUsers,
    early_adopter_slots_remaining: row.early_adopter_slots_remaining ?? 0,
    mrr_cents: row.mrr_cents ?? 0,
    conversion_rate: totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0,
  };
}

interface DashboardMetrics {
  currentMetrics: MetricData | null;
  previousMetrics: MetricData | null;
  historicalData: MetricData[];
}

export function MetricsContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    currentMetrics: null,
    previousMetrics: null,
    historicalData: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const supabase = createClient();

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        switch (timeRange) {
          case "7d":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "30d":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "90d":
            startDate.setDate(startDate.getDate() - 90);
            break;
        }

        // Fetch historical metrics
        const { data: historicalData, error } = await supabase
          .from("platform_metrics")
          .select("*")
          .gte("metric_date", startDate.toISOString().split("T")[0])
          .lte("metric_date", endDate.toISOString().split("T")[0])
          .order("metric_date", { ascending: false });

        if (error) {
          console.error("Error fetching metrics:", error);
        }

        const typedData = (historicalData || []).map(toMetricData);

        // Get current (most recent) and previous metrics for comparison
        const currentMetrics = typedData[0] || null;
        const previousMetrics = typedData[1] || null;

        setMetrics({
          currentMetrics,
          previousMetrics,
          historicalData: typedData.reverse(), // Oldest to newest for charts
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [timeRange]);

  function calculateChange(
    current: number | undefined,
    previous: number | undefined
  ): { value: number; isPositive: boolean } {
    if (!current || !previous || previous === 0) {
      return { value: 0, isPositive: true };
    }
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  }

  function formatMRR(cents: number | undefined): string {
    if (!cents) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  const userChange = calculateChange(
    metrics.currentMetrics?.total_users,
    metrics.previousMetrics?.total_users
  );

  const mrrChange = calculateChange(
    metrics.currentMetrics?.mrr_cents,
    metrics.previousMetrics?.mrr_cents
  );

  const conversionChange = calculateChange(
    metrics.currentMetrics?.conversion_rate,
    metrics.previousMetrics?.conversion_rate
  );

  const premiumChange = calculateChange(
    metrics.currentMetrics?.premium_users,
    metrics.previousMetrics?.premium_users
  );

  return (
    <>
      <Header
        title="Platform Metrics"
        description="Analytics and performance tracking"
      />

      <div className="p-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border p-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {range === "7d"
                  ? "7 Days"
                  : range === "30d"
                  ? "30 Days"
                  : "90 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Users"
            value={metrics.currentMetrics?.total_users?.toString() || "0"}
            change={userChange}
            icon={Users}
            loading={loading}
          />
          <MetricCard
            title="Monthly Recurring Revenue"
            value={formatMRR(metrics.currentMetrics?.mrr_cents)}
            change={mrrChange}
            icon={DollarSign}
            loading={loading}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${(metrics.currentMetrics?.conversion_rate || 0).toFixed(1)}%`}
            change={conversionChange}
            icon={TrendingUp}
            loading={loading}
          />
          <MetricCard
            title="Premium Users"
            value={metrics.currentMetrics?.premium_users?.toString() || "0"}
            change={premiumChange}
            icon={CreditCard}
            loading={loading}
          />
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <StatRow
                    label="Total Users"
                    value={metrics.currentMetrics?.total_users || 0}
                    total={metrics.currentMetrics?.total_users || 1}
                  />
                  <StatRow
                    label="Learning Period"
                    value={metrics.currentMetrics?.learning_users || 0}
                    total={metrics.currentMetrics?.total_users || 1}
                    color="bg-blue-500"
                  />
                  <StatRow
                    label="Premium Subscribers"
                    value={metrics.currentMetrics?.premium_users || 0}
                    total={metrics.currentMetrics?.total_users || 1}
                    color="bg-green-500"
                  />
                  <StatRow
                    label="Active Subscriptions"
                    value={metrics.currentMetrics?.active_subscriptions || 0}
                    total={metrics.currentMetrics?.total_users || 1}
                    color="bg-purple-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Early Adopter Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Early Adopter Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-32 animate-pulse rounded bg-muted" />
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Slots Remaining
                      </span>
                      <span className="font-medium">
                        {metrics.currentMetrics?.early_adopter_slots_remaining ||
                          1000}{" "}
                        / 1,000
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${
                            ((1000 -
                              (metrics.currentMetrics
                                ?.early_adopter_slots_remaining || 1000)) /
                              1000) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Early Adopter Price
                      </p>
                      <p className="text-2xl font-bold text-amber-500">
                        $19/mo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Annual billing
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Standard Price
                      </p>
                      <p className="text-2xl font-bold">$35/mo</p>
                      <p className="text-xs text-muted-foreground">
                        After 1,000 users
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historical Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Historical Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 animate-pulse rounded bg-muted" />
            ) : metrics.historicalData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No historical data available yet. Metrics are collected daily.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Users
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Learning
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Premium
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        MRR
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.historicalData.slice(-10).map((row) => (
                      <tr
                        key={row.metric_date}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          {new Date(row.metric_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.total_users}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.learning_users}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.premium_users}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMRR(row.mrr_cents)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.conversion_rate?.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: { value: number; isPositive: boolean };
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  loading,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change.value > 0 && (
              <div
                className={`flex items-center text-xs ${
                  change.isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {change.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {change.value.toFixed(1)}% from previous
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface StatRowProps {
  label: string;
  value: number;
  total: number;
  color?: string;
}

function StatRow({ label, value, total, color = "bg-primary" }: StatRowProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
