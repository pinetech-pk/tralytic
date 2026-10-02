"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, PeriodicPerformanceRow } from "@/lib/types/database";
import { winRate } from "@/lib/utils";

export type PeriodType = "weekly" | "monthly";
export type NumPeriods = 12 | 24;

interface PerformanceSummary {
  totalTrades: number;
  totalPnl: number;
  avgPnl: number;
  overallWinRate: number;
  totalWinningWeeks: number;
  totalLosingWeeks: number;
  /** Periods that actually contain trades — the denominator for the above. */
  periodsWithData: number;
  totalRRx: number;
  rrxPerTrade: number;
  bestPeriod: { label: string; pnl: number } | null;
  worstPeriod: { label: string; pnl: number } | null;
  avgTradesPerPeriod: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
}

interface UsePerformanceDataReturn {
  data: PeriodicPerformanceRow[];
  summary: PerformanceSummary;
  loading: boolean;
  error: string | null;
  periodType: PeriodType;
  numPeriods: NumPeriods;
  setPeriodType: (type: PeriodType) => void;
  setNumPeriods: (num: NumPeriods) => void;
  refetch: () => void;
}

function calculateSummary(data: PeriodicPerformanceRow[]): PerformanceSummary {
  if (data.length === 0) {
    return {
      totalTrades: 0,
      totalPnl: 0,
      avgPnl: 0,
      overallWinRate: 0,
      totalWinningWeeks: 0,
      totalLosingWeeks: 0,
      periodsWithData: 0,
      totalRRx: 0,
      rrxPerTrade: 0,
      bestPeriod: null,
      worstPeriod: null,
      avgTradesPerPeriod: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
    };
  }

  const totalTrades = data.reduce((sum, d) => sum + d.total_trades, 0);
  const totalWins = data.reduce((sum, d) => sum + d.winning_trades, 0);
  const totalLosses = data.reduce((sum, d) => sum + d.losing_trades, 0);
  const totalPnl = data.reduce((sum, d) => sum + d.total_pnl, 0);
  const totalRRx = data.reduce((sum, d) => sum + d.total_risk_reward, 0);

  // A period with no trades is neither winning nor losing; counting empty
  // weeks as losses made a profitable run look like 10 losing weeks of 12.
  const tradedPeriods = data.filter((d) => d.total_trades > 0);
  const winningPeriods = tradedPeriods.filter((d) => d.total_pnl > 0);
  const losingPeriods = tradedPeriods.filter((d) => d.total_pnl < 0);

  const bestPeriod = data.reduce(
    (best, d) => (d.total_pnl > (best?.total_pnl ?? -Infinity) ? d : best),
    data[0]
  );
  const worstPeriod = data.reduce(
    (worst, d) => (d.total_pnl < (worst?.total_pnl ?? Infinity) ? d : worst),
    data[0]
  );

  // Sum gross profit/loss from each period's per-trade breakdown
  const grossProfit = Math.round(
    data.reduce((sum, d) => sum + d.gross_profit, 0) * 100
  ) / 100;
  const grossLoss = Math.round(
    data.reduce((sum, d) => sum + d.gross_loss, 0) * 100
  ) / 100;

  return {
    totalTrades,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgPnl: totalTrades > 0 ? Math.round((totalPnl / data.length) * 100) / 100 : 0,
    // Decided trades only, matching every other win rate in the app.
    overallWinRate: Math.round(winRate(totalWins, totalLosses) * 100) / 100,
    totalWinningWeeks: winningPeriods.length,
    totalLosingWeeks: losingPeriods.length,
    periodsWithData: tradedPeriods.length,
    totalRRx: Math.round(totalRRx * 100) / 100,
    rrxPerTrade:
      totalTrades > 0 ? Math.round((totalRRx / totalTrades) * 100) / 100 : 0,
    bestPeriod: bestPeriod
      ? { label: bestPeriod.period_label, pnl: bestPeriod.total_pnl }
      : null,
    worstPeriod: worstPeriod
      ? { label: worstPeriod.period_label, pnl: worstPeriod.total_pnl }
      : null,
    avgTradesPerPeriod:
      data.length > 0 ? Math.round((totalTrades / data.length) * 10) / 10 : 0,
    grossProfit,
    grossLoss,
    profitFactor:
      grossLoss > 0
        ? Math.round((grossProfit / grossLoss) * 100) / 100
        : grossProfit > 0
          ? Infinity
          : 0,
  };
}

export interface PerformanceFilters {
  /** Exactly one strategy; ignored when noStrategy is set. */
  strategyId?: string;
  /** Restrict to trades with no strategy assigned. */
  noStrategy?: boolean;
  excludeWeekends?: boolean;
}

export function usePerformanceData(
  accountIds?: string[],
  includeArchived = false,
  filters: PerformanceFilters = {}
): UsePerformanceDataReturn {
  const { strategyId, noStrategy = false, excludeWeekends = false } = filters;
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [numPeriods, setNumPeriods] = useState<NumPeriods>(12);
  const [data, setData] = useState<PeriodicPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated");
        setData([]);
        setLoading(false);
        return;
      }

      const rpcParams: Database["public"]["Functions"]["get_periodic_performance"]["Args"] =
        {
          p_user_id: user.id,
          p_period_type: periodType,
          p_num_periods: numPeriods,
          p_include_archived: includeArchived,
          p_no_strategy: noStrategy,
          p_exclude_weekends: excludeWeekends,
        };
      if (accountIds && accountIds.length > 0) {
        rpcParams.p_account_ids = accountIds;
      }
      if (strategyId && !noStrategy) {
        rpcParams.p_strategy_id = strategyId;
      }

      const { data: result, error: rpcError } = await supabase.rpc(
        "get_periodic_performance",
        rpcParams
      );

      if (rpcError) {
        throw rpcError;
      }

      setData(result ?? []);
    } catch (err) {
      console.error("Failed to fetch performance data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch performance data"
      );
      setData([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    periodType,
    numPeriods,
    includeArchived,
    strategyId,
    noStrategy,
    excludeWeekends,
    JSON.stringify(accountIds),
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = calculateSummary(data);

  return {
    data,
    summary,
    loading,
    error,
    periodType,
    numPeriods,
    setPeriodType,
    setNumPeriods,
    refetch: fetchData,
  };
}
