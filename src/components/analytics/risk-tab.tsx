"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  BarChart3,
  AlertTriangle,
  Trophy,
  Zap,
} from "lucide-react";
import type { Trade } from "@/lib/types/database";

interface RiskTabProps {
  trades: Trade[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p
              className={`text-lg font-bold font-mono mt-0.5 ${valueColor ?? ""}`}
            >
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskTab({ trades }: RiskTabProps) {
  const riskMetrics = useMemo(() => {
    const tradesWithRisk = trades.filter(
      (t) => t.risk_amount !== null && t.risk_amount > 0
    );
    const tradesWithRiskPct = trades.filter(
      (t) => t.risk_percent !== null && t.risk_percent > 0
    );
    const tradesWithRRx = trades.filter(
      (t) => t.risk_reward_actual !== null
    );

    const avgRiskAmount =
      tradesWithRisk.length > 0
        ? tradesWithRisk.reduce((acc, t) => acc + t.risk_amount!, 0) /
          tradesWithRisk.length
        : 0;

    const avgRiskPercent =
      tradesWithRiskPct.length > 0
        ? tradesWithRiskPct.reduce((acc, t) => acc + t.risk_percent!, 0) /
          tradesWithRiskPct.length
        : 0;

    const totalRRx = trades.reduce(
      (acc, t) => acc + (t.risk_reward_actual || 0),
      0
    );
    const avgRRx =
      tradesWithRRx.length > 0
        ? totalRRx / tradesWithRRx.length
        : 0;

    // Max drawdown (peak-to-trough of cumulative PnL)
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    trades
      .filter((t) => t.pnl !== null)
      .forEach((t) => {
        cumulative += t.pnl!;
        if (cumulative > peak) peak = cumulative;
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      });

    // Consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentConsecutiveWins = 0;
    let currentConsecutiveLosses = 0;
    trades.forEach((t) => {
      if (t.is_winner === true) {
        currentConsecutiveWins++;
        currentConsecutiveLosses = 0;
        if (currentConsecutiveWins > maxConsecutiveWins)
          maxConsecutiveWins = currentConsecutiveWins;
      } else if (t.is_winner === false) {
        currentConsecutiveLosses++;
        currentConsecutiveWins = 0;
        if (currentConsecutiveLosses > maxConsecutiveLosses)
          maxConsecutiveLosses = currentConsecutiveLosses;
      }
    });

    // Largest win/loss
    const pnlValues = trades.map((t) => t.pnl || 0);
    const largestWin = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const largestLoss = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

    // Average win/loss
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
      avgRiskAmount: Math.round(avgRiskAmount * 100) / 100,
      avgRiskPercent: Math.round(avgRiskPercent * 100) / 100,
      totalRRx: Math.round(totalRRx * 100) / 100,
      avgRRx: Math.round(avgRRx * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
    };
  }, [trades]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No trades found for the selected account type
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Risk %"
          value={`${riskMetrics.avgRiskPercent.toFixed(2)}%`}
          icon={Shield}
        />
        <StatCard
          label="Avg Risk Amount"
          value={`$${riskMetrics.avgRiskAmount.toFixed(2)}`}
          icon={Shield}
        />
        <StatCard
          label="Total RRx"
          value={`${riskMetrics.totalRRx >= 0 ? "+" : ""}${riskMetrics.totalRRx.toFixed(2)}R`}
          icon={Target}
          valueColor={riskMetrics.totalRRx >= 0 ? "text-green" : "text-red"}
        />
        <StatCard
          label="Max Drawdown"
          value={`$${riskMetrics.maxDrawdown.toFixed(2)}`}
          icon={AlertTriangle}
          valueColor="text-red"
        />
      </div>

      {/* Win/Loss Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg RRx"
          value={`${riskMetrics.avgRRx >= 0 ? "+" : ""}${riskMetrics.avgRRx.toFixed(2)}R`}
          icon={BarChart3}
          valueColor={riskMetrics.avgRRx >= 0 ? "text-green" : "text-red"}
        />
        <StatCard
          label="Largest Win"
          value={`+$${riskMetrics.largestWin.toFixed(2)}`}
          icon={TrendingUp}
          valueColor="text-green"
        />
        <StatCard
          label="Largest Loss"
          value={`-$${Math.abs(riskMetrics.largestLoss).toFixed(2)}`}
          icon={TrendingDown}
          valueColor="text-red"
        />
        <StatCard
          label="Avg Win"
          value={`+$${riskMetrics.avgWin.toFixed(2)}`}
          icon={TrendingUp}
          valueColor="text-green"
        />
      </div>

      {/* Streak Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Loss"
          value={`-$${Math.abs(riskMetrics.avgLoss).toFixed(2)}`}
          icon={TrendingDown}
          valueColor="text-red"
        />
        <StatCard
          label="Max Consecutive Wins"
          value={String(riskMetrics.maxConsecutiveWins)}
          icon={Trophy}
          valueColor="text-green"
        />
        <StatCard
          label="Max Consecutive Losses"
          value={String(riskMetrics.maxConsecutiveLosses)}
          icon={Zap}
          valueColor="text-red"
        />
        <StatCard
          label="Total Trades"
          value={String(trades.length)}
          icon={BarChart3}
        />
      </div>
    </>
  );
}
