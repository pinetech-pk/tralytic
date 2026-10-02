"use client";

import { useMemo } from "react";
import type { Trade } from "@/lib/types/database";

export interface RiskMetrics {
  avgRiskAmount: number;
  avgRiskPercent: number;
  maxDrawdown: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  breakevenTrades: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Per-trade risk statistics the periodic RPC cannot express, derived from the
 * same filtered trade list the other analytics tabs use.
 */
export function useRiskMetrics(trades: Trade[]): RiskMetrics {
  return useMemo(() => {
    const withRisk = trades.filter(
      (t) => t.risk_amount !== null && t.risk_amount > 0
    );
    const withRiskPct = trades.filter(
      (t) => t.risk_percent !== null && t.risk_percent > 0
    );

    const avgRiskAmount =
      withRisk.length > 0
        ? withRisk.reduce((acc, t) => acc + t.risk_amount!, 0) / withRisk.length
        : 0;
    const avgRiskPercent =
      withRiskPct.length > 0
        ? withRiskPct.reduce((acc, t) => acc + t.risk_percent!, 0) /
          withRiskPct.length
        : 0;

    // Peak-to-trough of cumulative P&L, in trade order.
    let peak = 0;
    let cumulative = 0;
    let maxDrawdown = 0;
    for (const t of trades) {
      if (t.pnl === null) continue;
      cumulative += t.pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Break-evens interrupt neither streak — they are not a verdict.
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let runWins = 0;
    let runLosses = 0;
    for (const t of trades) {
      if (t.is_winner === true) {
        runWins++;
        runLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, runWins);
      } else if (t.is_winner === false) {
        runLosses++;
        runWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, runLosses);
      }
    }

    // Only trades with a recorded P&L — treating a null as 0 would report a
    // best trade of $0.00 for an all-losing set.
    const pnls = trades.filter((t) => t.pnl !== null).map((t) => t.pnl!);
    const largestWin = pnls.length > 0 ? Math.max(...pnls) : 0;
    const largestLoss = pnls.length > 0 ? Math.min(...pnls) : 0;

    const winners = trades.filter((t) => t.is_winner === true);
    const losers = trades.filter((t) => t.is_winner === false);
    const avgWin =
      winners.length > 0
        ? winners.reduce((acc, t) => acc + (t.pnl || 0), 0) / winners.length
        : 0;
    const avgLoss =
      losers.length > 0
        ? losers.reduce((acc, t) => acc + (t.pnl || 0), 0) / losers.length
        : 0;

    return {
      avgRiskAmount: round2(avgRiskAmount),
      avgRiskPercent: round2(avgRiskPercent),
      maxDrawdown: round2(maxDrawdown),
      maxConsecutiveWins,
      maxConsecutiveLosses,
      largestWin: round2(largestWin),
      largestLoss: round2(largestLoss),
      avgWin: round2(avgWin),
      avgLoss: round2(avgLoss),
      breakevenTrades: trades.filter(
        (t) => t.pnl !== null && t.is_winner === null
      ).length,
    };
  }, [trades]);
}
