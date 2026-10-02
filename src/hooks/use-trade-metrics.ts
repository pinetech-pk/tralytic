"use client";

import { useMemo } from "react";
import { winRate } from "@/lib/utils";
import type { Trade } from "@/lib/types/database";

export interface TradeMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevenTrades: number;
  winRate: number;

  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  maxDrawdown: number;

  totalRRx: number;
  rrxPerTrade: number;

  avgRiskAmount: number;
  avgRiskPercent: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Every Performance & Risk figure, derived from one filtered trade list so the
 * cards cannot disagree with each other about which window they describe.
 */
export function useTradeMetrics(trades: Trade[]): TradeMetrics {
  return useMemo(() => {
    const winners = trades.filter((t) => t.is_winner === true);
    const losers = trades.filter((t) => t.is_winner === false);
    const withPnl = trades.filter((t) => t.pnl !== null);

    const totalPnl = withPnl.reduce((acc, t) => acc + t.pnl!, 0);
    const grossProfit = withPnl
      .filter((t) => t.pnl! > 0)
      .reduce((acc, t) => acc + t.pnl!, 0);
    const grossLoss = Math.abs(
      withPnl.filter((t) => t.pnl! < 0).reduce((acc, t) => acc + t.pnl!, 0)
    );

    // Peak-to-trough of cumulative P&L, in trade order.
    let peak = 0;
    let cumulative = 0;
    let maxDrawdown = 0;
    for (const t of withPnl) {
      cumulative += t.pnl!;
      if (cumulative > peak) peak = cumulative;
      maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
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
    const pnls = withPnl.map((t) => t.pnl!);
    const withRisk = trades.filter((t) => t.risk_amount !== null && t.risk_amount > 0);
    const withRiskPct = trades.filter((t) => t.risk_percent !== null && t.risk_percent > 0);
    const totalRRx = trades.reduce((acc, t) => acc + (t.risk_reward_actual || 0), 0);

    const mean = (xs: number[]) =>
      xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

    return {
      totalTrades: trades.length,
      wins: winners.length,
      losses: losers.length,
      breakevenTrades: trades.filter(
        (t) => t.pnl !== null && t.is_winner === null
      ).length,
      winRate: round2(winRate(winners.length, losers.length)),

      totalPnl: round2(totalPnl),
      grossProfit: round2(grossProfit),
      grossLoss: round2(grossLoss),
      profitFactor:
        grossLoss > 0
          ? round2(grossProfit / grossLoss)
          : grossProfit > 0
            ? Infinity
            : 0,
      maxDrawdown: round2(maxDrawdown),

      totalRRx: round2(totalRRx),
      rrxPerTrade: trades.length > 0 ? round2(totalRRx / trades.length) : 0,

      avgRiskAmount: round2(mean(withRisk.map((t) => t.risk_amount!))),
      avgRiskPercent: round2(mean(withRiskPct.map((t) => t.risk_percent!))),
      maxConsecutiveWins,
      maxConsecutiveLosses,
      largestWin: pnls.length > 0 ? round2(Math.max(...pnls)) : 0,
      largestLoss: pnls.length > 0 ? round2(Math.min(...pnls)) : 0,
      avgWin: round2(mean(winners.map((t) => t.pnl || 0))),
      avgLoss: round2(mean(losers.map((t) => t.pnl || 0))),
    };
  }, [trades]);
}
