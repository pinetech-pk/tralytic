"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Account, Trade, Strategy } from "@/lib/types/database";
import { OverviewTab } from "@/components/analytics/overview-tab";
import { PerformanceTab } from "@/components/analytics/performance-tab";
import { StrategyTab } from "@/components/analytics/strategy-tab";
import { SessionTab } from "@/components/analytics/session-tab";
import { RiskTab } from "@/components/analytics/risk-tab";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "funded", label: "Funded" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[380px] rounded-lg" />
        <Skeleton className="h-[380px] rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAccountType, setSelectedAccountType] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  // Fetch accounts and strategies on mount
  useEffect(() => {
    async function fetchBase() {
      const [accountsRes, strategiesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("is_active", true)
          .order("name") as unknown as Promise<{
          data: Account[] | null;
          error: any;
        }>,
        supabase
          .from("strategies")
          .select("*")
          .eq("is_active", true)
          .order("name") as unknown as Promise<{
          data: Strategy[] | null;
          error: any;
        }>,
      ]);
      if (accountsRes.data) setAccounts(accountsRes.data);
      if (strategiesRes.data) setStrategies(strategiesRes.data);
      setAccountsLoaded(true);
    }
    fetchBase();
  }, [supabase]);

  // Filtered account IDs for the Performance tab RPC
  const filteredAccountIds = useMemo(() => {
    if (!selectedAccountType) return [];
    return accounts
      .filter((a) => a.account_type === selectedAccountType)
      .map((a) => a.id);
  }, [selectedAccountType, accounts]);

  // Fetch trades based on selected account type
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let query = (supabase.from("trades") as any)
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("entry_date", { ascending: true });

      if (selectedAccountType) {
        const typeIds = accounts
          .filter((a) => a.account_type === selectedAccountType)
          .map((a) => a.id);
        if (typeIds.length === 0) {
          setTrades([]);
          setLoading(false);
          return;
        }
        query = query.in("account_id", typeIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching trades:", error);
        setTrades([]);
      } else {
        setTrades((data as Trade[]) || []);
      }
    } catch (err) {
      console.error("Error fetching trades:", err);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedAccountType, accounts]);

  // Fetch trades after accounts are loaded
  useEffect(() => {
    if (accountsLoaded) {
      fetchTrades();
    }
  }, [fetchTrades, accountsLoaded]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics"
        description="Deep dive into your trading performance"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Account Type Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Account Type:
          </span>
          <Tabs
            value={selectedAccountType}
            onValueChange={setSelectedAccountType}
          >
            <TabsList>
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="strategy">By Strategy</TabsTrigger>
            <TabsTrigger value="session">By Session</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <OverviewTab trades={trades} />
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <PerformanceTab accountIds={filteredAccountIds} />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <StrategyTab trades={trades} strategies={strategies} />
            )}
          </TabsContent>

          <TabsContent value="session" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <SessionTab trades={trades} />
            )}
          </TabsContent>

          <TabsContent value="risk" className="space-y-6 mt-6">
            {loading ? <LoadingSkeleton /> : <RiskTab trades={trades} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
