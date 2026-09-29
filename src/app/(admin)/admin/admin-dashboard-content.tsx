"use client";

import { useEffect, useState } from "react";
import { Users, CreditCard, TrendingUp, UserCheck, UserX, Clock } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  learningUsers: number;
  premiumUsers: number;
  expiredUsers: number;
  earlyAdopterSlots: number;
}

export function AdminDashboardContent() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeUsers: 0,
    learningUsers: 0,
    premiumUsers: 0,
    expiredUsers: 0,
    earlyAdopterSlots: 1000,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total users
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch subscription stats
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("status");

        let learningUsers = 0;
        let premiumUsers = 0;
        let expiredUsers = 0;

        if (subscriptions) {
          for (const sub of subscriptions) {
            if (sub.status === "learning") learningUsers++;
            else if (sub.status === "active") premiumUsers++;
            else if (sub.status === "expired") expiredUsers++;
          }
        }

        // Fetch platform metrics for early adopter slots
        const { data: metrics } = await supabase
          .from("platform_metrics")
          .select("early_adopter_slots_remaining")
          .order("metric_date", { ascending: false })
          .limit(1)
          .single();

        setStats({
          totalUsers: totalUsers || 0,
          activeUsers: learningUsers + premiumUsers,
          learningUsers,
          premiumUsers,
          expiredUsers,
          earlyAdopterSlots: metrics?.early_adopter_slots_remaining ?? 1000,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <Header
        title="Admin Dashboard"
        description="Platform overview and management"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            loading={loading}
          />
          <StatsCard
            title="Active Users"
            value={stats.activeUsers}
            description="Learning + Premium"
            icon={UserCheck}
            loading={loading}
          />
          <StatsCard
            title="Learning Period"
            value={stats.learningUsers}
            description="Free trial users"
            icon={Clock}
            loading={loading}
          />
          <StatsCard
            title="Premium Users"
            value={stats.premiumUsers}
            description="Paying subscribers"
            icon={CreditCard}
            className="text-green"
            loading={loading}
          />
          <StatsCard
            title="Expired Users"
            value={stats.expiredUsers}
            description="Trial ended, not converted"
            icon={UserX}
            className="text-red"
            loading={loading}
          />
          <StatsCard
            title="Early Adopter Slots"
            value={stats.earlyAdopterSlots}
            description="Remaining at $19/mo pricing"
            icon={TrendingUp}
            className="text-amber-400"
            loading={loading}
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard
            title="User Management"
            description="View, edit, and manage user accounts"
            href="/admin/users"
          />
          <QuickLinkCard
            title="Platform Metrics"
            description="Detailed analytics and trends"
            href="/admin/metrics"
          />
          <QuickLinkCard
            title="Billing & Subscriptions"
            description="Manage subscriptions and revenue"
            href="/admin/billing"
          />
        </div>
      </div>
    </>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  loading?: boolean;
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  loading,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 text-muted-foreground ${className || ""}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <div className={`text-2xl font-bold ${className || ""}`}>{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickLinkCardProps {
  title: string;
  description: string;
  href: string;
}

function QuickLinkCard({ title, description, href }: QuickLinkCardProps) {
  return (
    <a href={href}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </a>
  );
}
