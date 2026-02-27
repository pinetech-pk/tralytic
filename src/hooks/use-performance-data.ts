"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, PeriodicPerformanceRow } from "@/lib/types/database";

export type PeriodType = "weekly" | "monthly";
export type NumPeriods = 12 | 24;

interface PerformanceSummary {
  totalTrades: number;
  totalPnl: number;
  avgPnl: number;
  overallWinRate: number;
  totalWinningWeeks: number;
  totalLosingWeeks: number;
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
  const totalPnl = data.reduce((sum, d) => sum + d.total_pnl, 0);
  const winningPeriods = data.filter((d) => d.total_pnl > 0);
  const losingPeriods = data.filter((d) => d.total_pnl <= 0);

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
    overallWinRate:
      totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100 * 100) / 100 : 0,
    totalWinningWeeks: winningPeriods.length,
    totalLosingWeeks: losingPeriods.length,
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

export function usePerformanceData(accountIds?: string[]): UsePerformanceDataReturn {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpcParams: Record<string, any> = {
        p_user_id: user.id,
        p_period_type: periodType,
        p_num_periods: numPeriods,
      };
      if (accountIds && accountIds.length > 0) {
        rpcParams.p_account_ids = accountIds;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase.rpc as any)(
        "get_periodic_performance",
        rpcParams
      );

      if (rpcError) {
        throw rpcError;
      }

      setData((result as PeriodicPerformanceRow[]) ?? []);
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
  }, [periodType, numPeriods, JSON.stringify(accountIds)]);

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
