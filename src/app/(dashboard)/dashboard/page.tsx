"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  BarChart3,
  Award,
  Repeat,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart";
import { WinLossPie } from "@/components/charts/win-loss-pie";
import { PerformanceBar } from "@/components/charts/performance-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { Account, Strategy } from "@/lib/types/database";

interface TradeStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  total_risk_reward: number;
}

interface EquityPoint {
  trade_number: number;
  trade_date: string;
  trade_pnl: number;
  cumulative_pnl: number;
  equity: number;
}

interface DailyPnL {
  date: string;
  total_pnl: number;
  trade_count: number;
  winning_trades: number;
  win_rate: number;
}

interface StrategyPerformance {
  strategy_id: string;
  strategy_name: string;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  avg_risk_reward: number;
}

interface SessionPerformance {
  session: string;
  session_name: string;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
}

const SESSION_OPTIONS = [
  { value: "", label: "All Sessions" },
  { value: "AS", label: "Asian" },
  { value: "LO", label: "London" },
  { value: "NY", label: "New York" },
  { value: "OTHER", label: "Other" },
];

const TIME_RANGE_OPTIONS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3days", label: "Last 3 Days" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "60days", label: "Last 60 Days" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "funded", label: "Funded" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
];

const SESSION_COLORS: Record<string, string> = {
  NY: "bg-green",
  LO: "bg-blue",
  AS: "bg-purple",
  OTHER: "bg-gray-500",
};

// Helper function to format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to calculate date range
function getDateRange(timeRange: string): { startDate?: string; endDate?: string } {
  if (!timeRange) return {};

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate: Date;
  let endDate: Date;

  switch (timeRange) {
    case "today":
      startDate = today;
      endDate = today;
      break;
    case "yesterday":
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "3days":
      startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "7days":
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "30days":
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "60days":
      startDate = new Date(today.getTime() - 59 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    default:
      return {};
  }

  // Format with time boundaries to include the full day
  // startDate at 00:00:00, endDate at 23:59:59
  return {
    startDate: `${formatLocalDate(startDate)}T00:00:00`,
    endDate: `${formatLocalDate(endDate)}T23:59:59`,
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Filter states
  const [selectedAccountType, setSelectedAccountType] = useState("personal");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState("7days");

  // Data states
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [dailyPnL, setDailyPnL] = useState<DailyPnL[]>([]);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformance[]>([]);
  const [sessionPerformance, setSessionPerformance] = useState<SessionPerformance[]>([]);

  const supabase = createClient();

  // Fetch accounts and strategies for filters
  useEffect(() => {
    async function fetchFilters() {
      const [accountsRes, strategiesRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("is_active", true).order("name"),
        supabase.from("strategies").select("*").eq("is_active", true).order("name"),
      ]);

      if (accountsRes.data) setAccounts(accountsRes.data);
      if (strategiesRes.data) setStrategies(strategiesRes.data);
    }

    fetchFilters();
  }, [supabase]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { startDate, endDate } = getDateRange(selectedTimeRange);

      // Build the query for trades
      let tradesQuery = supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id);

      if (selectedAccount) {
        tradesQuery = tradesQuery.eq("account_id", selectedAccount);
      } else if (selectedAccountType) {
        const typeAccountIds = accounts
          .filter((a) => a.account_type === selectedAccountType)
          .map((a) => a.id);
        if (typeAccountIds.length > 0) {
          tradesQuery = tradesQuery.in("account_id", typeAccountIds);
        } else {
          // No accounts of this type — show empty state
          setStats(null);
          setEquityData([]);
          setDailyPnL([]);
          setStrategyPerformance([]);
          setSessionPerformance([]);
          setLoading(false);
          return;
        }
      }
      if (selectedStrategy) {
        tradesQuery = tradesQuery.eq("strategy_id", selectedStrategy);
      }
      if (selectedSession) {
        tradesQuery = tradesQuery.eq("session", selectedSession);
      }
      if (startDate) {
        tradesQuery = tradesQuery.gte("entry_date", startDate);
      }
      if (endDate) {
        tradesQuery = tradesQuery.lte("entry_date", endDate);
      }

      const { data: trades, error: tradesError } = await tradesQuery.order("entry_date", { ascending: true }) as { data: any[] | null; error: any };

      if (tradesError) {
        console.error("Error fetching trades:", tradesError);
        setLoading(false);
        return;
      }

      const allTrades = (trades || []) as any[];

      // Calculate stats from trades
      const totalTrades = allTrades.length;
      const winners = allTrades.filter(t => t.is_winner === true);
      const losers = allTrades.filter(t => t.is_winner === false);
      const winningTrades = winners.length;
      const losingTrades = losers.length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const totalPnl = allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const avgWin = winningTrades > 0 ? winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades : 0;
      const totalWins = winners.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalLosses = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0));
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
      const totalRiskReward = allTrades.reduce((sum, t) => sum + (t.risk_reward_actual || 0), 0);

      setStats({
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate,
        total_pnl: totalPnl,
        avg_win: avgWin,
        avg_loss: avgLoss,
        profit_factor: profitFactor,
        total_risk_reward: totalRiskReward,
      });

      // Calculate equity curve
      let cumulative = 100; // Starting capital
      const equityPoints: EquityPoint[] = allTrades.map((trade, index) => {
        cumulative += trade.pnl || 0;
        return {
          trade_number: index + 1,
          trade_date: trade.entry_date,
          trade_pnl: trade.pnl || 0,
          cumulative_pnl: cumulative - 100,
          equity: cumulative,
        };
      });
      setEquityData(equityPoints);

      // Calculate daily P&L
      const dailyMap = new Map<string, { pnl: number; count: number; wins: number }>();
      allTrades.forEach(trade => {
        const date = trade.entry_date?.split("T")[0] || trade.entry_date;
        const existing = dailyMap.get(date) || { pnl: 0, count: 0, wins: 0 };
        existing.pnl += trade.pnl || 0;
        existing.count += 1;
        if (trade.is_winner) existing.wins += 1;
        dailyMap.set(date, existing);
      });
      const dailyData: DailyPnL[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        total_pnl: data.pnl,
        trade_count: data.count,
        winning_trades: data.wins,
        win_rate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }));
      setDailyPnL(dailyData);

      // Calculate strategy performance
      const strategyMap = new Map<string, { name: string; trades: typeof allTrades }>();
      allTrades.forEach(trade => {
        if (trade.strategy_id) {
          const existing = strategyMap.get(trade.strategy_id) || { name: "", trades: [] };
          existing.trades.push(trade);
          strategyMap.set(trade.strategy_id, existing);
        }
      });

      // Fetch strategy names
      const strategyIds = Array.from(strategyMap.keys());
      if (strategyIds.length > 0) {
        const { data: strategiesData } = await supabase
          .from("strategies")
          .select("id, name")
          .in("id", strategyIds) as { data: { id: string; name: string }[] | null; error: any };

        strategiesData?.forEach(s => {
          const existing = strategyMap.get(s.id);
          if (existing) existing.name = s.name;
        });
      }

      const strategyPerf: StrategyPerformance[] = Array.from(strategyMap.entries()).map(([id, data]) => {
        const stratTrades = data.trades;
        const stratWins = stratTrades.filter(t => t.is_winner === true);
        return {
          strategy_id: id,
          strategy_name: data.name || "Unknown",
          total_trades: stratTrades.length,
          winning_trades: stratWins.length,
          win_rate: stratTrades.length > 0 ? (stratWins.length / stratTrades.length) * 100 : 0,
          total_pnl: stratTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
          avg_pnl: stratTrades.length > 0 ? stratTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / stratTrades.length : 0,
          avg_risk_reward: stratTrades.length > 0 ? stratTrades.reduce((sum, t) => sum + (t.risk_reward_actual || 0), 0) / stratTrades.length : 0,
        };
      });
      setStrategyPerformance(strategyPerf);

      // Calculate session performance
      const sessionMap = new Map<string, typeof allTrades>();
      const sessionNames: Record<string, string> = { AS: "Asian", LO: "London", NY: "New York", OTHER: "Other" };
      allTrades.forEach(trade => {
        const session = trade.session || "OTHER";
        const existing = sessionMap.get(session) || [];
        existing.push(trade);
        sessionMap.set(session, existing);
      });

      const sessionPerf: SessionPerformance[] = Array.from(sessionMap.entries()).map(([session, sessTrades]) => {
        const sessWins = sessTrades.filter(t => t.is_winner === true);
        return {
          session,
          session_name: sessionNames[session] || session,
          total_trades: sessTrades.length,
          winning_trades: sessWins.length,
          win_rate: sessTrades.length > 0 ? (sessWins.length / sessTrades.length) * 100 : 0,
          total_pnl: sessTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        };
      });
      setSessionPerformance(sessionPerf);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedAccountType, accounts, selectedAccount, selectedStrategy, selectedSession, selectedTimeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Transform data for charts
  const chartEquityData = equityData.map((point, index) => ({
    trade: point.trade_number || index + 1,
    equity: point.equity,
    pnl: point.trade_pnl,
  }));

  const chartDailyData = dailyPnL.slice(-30).map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    pnl: day.total_pnl,
    trades: day.trade_count,
  }));

  // Account and Strategy filter options
  const filteredAccounts = selectedAccountType
    ? accounts.filter((a) => a.account_type === selectedAccountType)
    : accounts;

  const accountOptions = [
    { value: "", label: "All Accounts" },
    ...filteredAccounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const strategyOptions = [
    { value: "", label: "All Strategies" },
    ...strategies.map((s) => ({ value: s.id, label: s.name })),
  ];

  // Show empty state when no data
  const hasData = stats && stats.total_trades > 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" description="Overview of your trading performance" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Account Type Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Account Type:</span>
          <Tabs
            value={selectedAccountType}
            onValueChange={(val) => {
              setSelectedAccountType(val);
              setSelectedAccount("");
            }}
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

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              options={accountOptions}
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              options={strategyOptions}
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              options={SESSION_OPTIONS}
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              options={TIME_RANGE_OPTIONS}
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          // Loading skeleton
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : !hasData ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No trades yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Start logging your trades to see your performance analytics here.
              Your equity curve, win rate, and other metrics will appear once you add trades.
            </p>
          </div>
        ) : (
          <>
            {/* Primary Stats Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Win Rate"
                value={`${stats.win_rate.toFixed(1)}%`}
                subValue="Overall"
                icon={Target}
                trend={stats.win_rate >= 50 ? "up" : "down"}
              />
              <StatCard
                title="Total P&L"
                value={`$${stats.total_pnl.toFixed(2)}`}
                subValue={stats.total_pnl >= 0 ? "Profit" : "Loss"}
                icon={DollarSign}
                trend={stats.total_pnl >= 0 ? "up" : "down"}
              />
              <StatCard
                title="Total RRx"
                value={`${(stats.total_risk_reward || 0).toFixed(2)}R`}
                subValue="Risk-to-Reward"
                icon={Repeat}
                trend={(stats.total_risk_reward || 0) >= 0 ? "up" : "down"}
              />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Trades"
                value={stats.total_trades}
                subValue={`${stats.winning_trades}W / ${stats.losing_trades}L`}
                icon={BarChart3}
              />
              <StatCard
                title="Avg Win"
                value={`$${stats.avg_win.toFixed(2)}`}
                icon={TrendingUp}
                trend="up"
              />
              <StatCard
                title="Avg Loss"
                value={`$${Math.abs(stats.avg_loss).toFixed(2)}`}
                icon={TrendingDown}
                trend="down"
              />
              <StatCard
                title="Profit Factor"
                value={stats.profit_factor.toFixed(2)}
                icon={Award}
                trend={stats.profit_factor >= 1 ? "up" : "down"}
              />
            </div>

            {/* Equity Curve - Full Width */}
            <EquityCurve data={chartEquityData} />

            {/* Daily P&L - Full Width */}
            <DailyPnLChart data={chartDailyData} />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WinLossPie
                wins={stats.winning_trades}
                losses={stats.losing_trades}
              />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Strategy Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strategyPerformance.length > 0 ? (
                    strategyPerformance.map((strategy) => (
                      <PerformanceBar
                        key={strategy.strategy_id}
                        label={strategy.strategy_name}
                        value={strategy.win_rate}
                        maxValue={100}
                        trades={strategy.total_trades}
                        pnl={strategy.total_pnl}
                        color="bg-blue"
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No strategy data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Session Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessionPerformance.length > 0 ? (
                    sessionPerformance.map((session) => (
                      <PerformanceBar
                        key={session.session}
                        label={session.session_name}
                        value={session.win_rate}
                        maxValue={100}
                        trades={session.total_trades}
                        pnl={session.total_pnl}
                        color={SESSION_COLORS[session.session] || "bg-gray-500"}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No session data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
