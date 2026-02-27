"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart";
import { WinLossPie } from "@/components/charts/win-loss-pie";
import { PerformanceBar } from "@/components/charts/performance-bar";
import type { Trade } from "@/lib/types/database";

interface OverviewTabProps {
  trades: Trade[];
}

function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${color ?? ""}`}>{value}</span>
    </div>
  );
}

export function OverviewTab({ trades }: OverviewTabProps) {
  // Equity curve data (cumulative P&L per trade)
  const equityData = useMemo(() => {
    let cumulative = 0;
    return trades
      .filter((t) => t.pnl !== null)
      .map((t, i) => {
        cumulative += t.pnl!;
        return {
          trade: i + 1,
          equity: Math.round(cumulative * 100) / 100,
          pnl: t.pnl!,
        };
      });
  }, [trades]);

  // Daily P&L data
  const dailyPnL = useMemo(() => {
    const grouped: Record<string, { pnl: number; trades: number }> = {};
    trades.forEach((t) => {
      if (t.pnl === null) return;
      const raw = (t.exit_date || t.entry_date)?.split("T")[0];
      if (!raw) return;
      if (!grouped[raw]) grouped[raw] = { pnl: 0, trades: 0 };
      grouped[raw].pnl += t.pnl;
      grouped[raw].trades += 1;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        pnl: Math.round(d.pnl * 100) / 100,
        trades: d.trades,
      }));
  }, [trades]);

  // Win/loss counts
  const wins = trades.filter((t) => t.is_winner === true).length;
  const losses = trades.filter((t) => t.is_winner === false).length;

  // Direction stats
  const directionStats = useMemo(() => {
    const directions = ["LONG", "SHORT"] as const;
    return directions.map((dir) => {
      const dirTrades = trades.filter((t) => t.direction === dir);
      const dirWins = dirTrades.filter((t) => t.is_winner === true).length;
      const dirPnl = dirTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
      return {
        name: dir === "LONG" ? "Long" : "Short",
        winRate:
          dirTrades.length > 0
            ? Math.round((dirWins / dirTrades.length) * 100)
            : 0,
        trades: dirTrades.length,
        pnl: Math.round(dirPnl * 100) / 100,
        color: dir === "LONG" ? "bg-green" : "bg-red",
      };
    });
  }, [trades]);

  // Key metrics
  const metrics = useMemo(() => {
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const grossProfit = trades.reduce(
      (acc, t) => acc + (t.pnl && t.pnl > 0 ? t.pnl : 0),
      0
    );
    const grossLoss = Math.abs(
      trades.reduce((acc, t) => acc + (t.pnl && t.pnl < 0 ? t.pnl : 0), 0)
    );
    const profitFactor =
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
          ? Infinity
          : 0;
    const totalRRx = trades.reduce(
      (acc, t) => acc + (t.risk_reward_actual || 0),
      0
    );
    const totalPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const bestTrade =
      trades.length > 0 ? Math.max(...trades.map((t) => t.pnl || 0)) : 0;
    const worstTrade =
      trades.length > 0 ? Math.min(...trades.map((t) => t.pnl || 0)) : 0;

    return {
      totalTrades,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalRRx: Math.round(totalRRx * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
    };
  }, [trades, wins]);

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
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EquityCurve data={equityData} title="Equity Curve" />
        <DailyPnLChart data={dailyPnL} title="Daily P&L" />
      </div>

      {/* Win/Loss, Direction, Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WinLossPie wins={wins} losses={losses} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Direction Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {directionStats.map((stat) => (
              <PerformanceBar
                key={stat.name}
                label={stat.name}
                value={stat.winRate}
                maxValue={100}
                trades={stat.trades}
                pnl={stat.pnl}
                color={stat.color}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="Total Trades"
              value={String(metrics.totalTrades)}
            />
            <MetricRow
              label="Total P&L"
              value={formatPnl(metrics.totalPnl)}
              color={metrics.totalPnl >= 0 ? "text-green" : "text-red"}
            />
            <MetricRow
              label="Win Rate"
              value={`${metrics.winRate}%`}
              color={metrics.winRate >= 50 ? "text-green" : "text-red"}
            />
            <MetricRow
              label="Profit Factor"
              value={
                metrics.profitFactor === Infinity
                  ? "∞"
                  : metrics.profitFactor.toFixed(2)
              }
              color={metrics.profitFactor >= 1 ? "text-green" : "text-red"}
            />
            <MetricRow
              label="Total RRx"
              value={`${metrics.totalRRx >= 0 ? "+" : ""}${metrics.totalRRx.toFixed(2)}R`}
              color={metrics.totalRRx >= 0 ? "text-green" : "text-red"}
            />
            <MetricRow
              label="Best Trade"
              value={formatPnl(metrics.bestTrade)}
              color="text-green"
            />
            <MetricRow
              label="Worst Trade"
              value={formatPnl(metrics.worstTrade)}
              color="text-red"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
