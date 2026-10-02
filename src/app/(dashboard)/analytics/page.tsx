"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getDateRange, isWeekendUtc } from "@/lib/utils";
import type { Account, Trade, Strategy } from "@/lib/types/database";
import { OverviewTab } from "@/components/analytics/overview-tab";
import { PerformanceTab } from "@/components/analytics/performance-tab";
import { ConsistencyTab } from "@/components/analytics/consistency-tab";
import { StrategyTab } from "@/components/analytics/strategy-tab";
import { SessionTab } from "@/components/analytics/session-tab";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "funded", label: "Funded" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
];

/** Sentinel for trades with no strategy, which "" already means "all". */
const NO_STRATEGY = "__none__";

// Longer horizons than the dashboard's — backtest analysis spans weeks.
const TIME_RANGE_OPTIONS = [
  { value: "", label: "All Time" },
  { value: "7days", label: "Last 7 Days" },
  { value: "15days", label: "Last 15 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 3 Months" },
  { value: "180days", label: "Last 6 Months" },
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
  const [selectedTimeRange, setSelectedTimeRange] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
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
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("strategies")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);
      if (accountsRes.data) setAccounts(accountsRes.data);
      if (strategiesRes.data) setStrategies(strategiesRes.data);
      setAccountsLoaded(true);
    }
    fetchBase();
  }, [supabase]);

  /**
   * Only strategies that actually appear in the fetched scope — listing every
   * strategy in the journal would offer filters that return nothing.
   */
  const availableStrategies = useMemo(() => {
    const ids = new Set(trades.map((t) => t.strategy_id).filter(Boolean));
    const options = strategies
      .filter((s) => ids.has(s.id))
      .map((s) => ({ value: s.id, label: s.name }));

    if (trades.some((t) => t.strategy_id === null)) {
      options.push({ value: NO_STRATEGY, label: "— No Strategy —" });
    }
    return options;
  }, [trades, strategies]);

  // A strategy picked under one account type may not exist under the next.
  useEffect(() => {
    if (
      selectedStrategy &&
      !availableStrategies.some((o) => o.value === selectedStrategy)
    ) {
      setSelectedStrategy("");
    }
  }, [availableStrategies, selectedStrategy]);

  const visibleTrades = useMemo(() => {
    return trades.filter((t) => {
      if (selectedStrategy === NO_STRATEGY) {
        if (t.strategy_id !== null) return false;
      } else if (selectedStrategy && t.strategy_id !== selectedStrategy) {
        return false;
      }
      if (excludeWeekends && isWeekendUtc(t.entry_date)) return false;
      return true;
    });
  }, [trades, selectedStrategy, excludeWeekends]);

  // The Performance tab reads from the RPC, so its filters are pushed down
  // rather than applied to an already-fetched array.
  const performanceFilters = useMemo(
    () => ({
      strategyId:
        selectedStrategy && selectedStrategy !== NO_STRATEGY
          ? selectedStrategy
          : undefined,
      noStrategy: selectedStrategy === NO_STRATEGY,
      excludeWeekends,
    }),
    [selectedStrategy, excludeWeekends]
  );

  // Consistency groups by its own weeks or months, so a page-level date
  // range there would be a second, conflicting window.
  const showsOwnPeriod = activeTab === "consistency";

  const weekendCount = useMemo(
    () => trades.filter((t) => isWeekendUtc(t.entry_date)).length,
    [trades]
  );

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

      let query = supabase
        .from("trades_with_archive")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("entry_date", { ascending: true });

      if (!includeArchived) {
        query = query.eq("account_is_archived", false);
      }

      const { startDate, endDate } = getDateRange(selectedTimeRange);
      if (startDate) query = query.gte("entry_date", startDate);
      if (endDate) query = query.lte("entry_date", endDate);

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
  }, [supabase, selectedAccountType, accounts, includeArchived, selectedTimeRange]);

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
        <div className="flex flex-wrap items-center gap-3">
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

          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include archived accounts
          </label>
        </div>

        {/* Period, strategy and weekend filters */}
        <div className="flex flex-wrap items-end gap-4">
          {/* The breakdown table groups by its own weeks or months, so a
              date range here would be a second, conflicting window. */}
          {!showsOwnPeriod && (
            <div className="w-48 space-y-1">
              <span className="text-xs text-muted-foreground">Period</span>
              <Select
                options={TIME_RANGE_OPTIONS}
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
              />
            </div>
          )}

          <div className="w-64 space-y-1">
            <span className="text-xs text-muted-foreground">Strategy</span>
            <Select
              options={[
                { value: "", label: "All Strategies" },
                ...availableStrategies,
              ]}
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              disabled={availableStrategies.length === 0}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer pb-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={excludeWeekends}
              onChange={(e) => setExcludeWeekends(e.target.checked)}
            />
            Exclude weekends (UTC)
            {weekendCount > 0 && (
              <span className="text-xs">({weekendCount} trades)</span>
            )}
          </label>

          {visibleTrades.length !== trades.length && (
            <span className="text-xs text-muted-foreground pb-2">
              Showing {visibleTrades.length} of {trades.length} trades
            </span>
          )}
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="consistency">Consistency</TabsTrigger>
            <TabsTrigger value="strategy">By Strategy</TabsTrigger>
            <TabsTrigger value="session">By Session</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <OverviewTab trades={visibleTrades} />
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            {loading ? <LoadingSkeleton /> : <PerformanceTab trades={visibleTrades} />}
          </TabsContent>

          <TabsContent value="consistency" className="space-y-6 mt-6">
            <ConsistencyTab
              accountIds={filteredAccountIds}
              includeArchived={includeArchived}
              filters={performanceFilters}
            />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <StrategyTab trades={visibleTrades} strategies={strategies} />
            )}
          </TabsContent>

          <TabsContent value="session" className="space-y-6 mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <SessionTab trades={visibleTrades} />
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
