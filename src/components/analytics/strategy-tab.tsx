"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { PerformanceBar } from "@/components/charts/performance-bar";
import type { Trade, Strategy } from "@/lib/types/database";

interface StrategyTabProps {
  trades: Trade[];
  strategies: Strategy[];
}

interface StrategyStats {
  id: string;
  name: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  totalRRx: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
}

function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

export function StrategyTab({ trades, strategies }: StrategyTabProps) {
  const strategyStats = useMemo(() => {
    const strategyMap = new Map<string, Trade[]>();

    trades.forEach((t) => {
      const key = t.strategy_id || "__none__";
      if (!strategyMap.has(key)) strategyMap.set(key, []);
      strategyMap.get(key)!.push(t);
    });

    const stats: StrategyStats[] = [];
    strategyMap.forEach((strategyTrades, strategyId) => {
      const strategy = strategies.find((s) => s.id === strategyId);
      const name = strategy?.name || "No Strategy";

      const wins = strategyTrades.filter((t) => t.is_winner === true).length;
      const losses = strategyTrades.filter((t) => t.is_winner === false).length;
      const totalPnl = strategyTrades.reduce(
        (acc, t) => acc + (t.pnl || 0),
        0
      );
      const avgPnl =
        strategyTrades.length > 0 ? totalPnl / strategyTrades.length : 0;
      const totalRRx = strategyTrades.reduce(
        (acc, t) => acc + (t.risk_reward_actual || 0),
        0
      );
      const grossProfit = strategyTrades.reduce(
        (acc, t) => acc + (t.pnl && t.pnl > 0 ? t.pnl : 0),
        0
      );
      const grossLoss = Math.abs(
        strategyTrades.reduce(
          (acc, t) => acc + (t.pnl && t.pnl < 0 ? t.pnl : 0),
          0
        )
      );
      const profitFactor =
        grossLoss > 0
          ? grossProfit / grossLoss
          : grossProfit > 0
            ? Infinity
            : 0;

      stats.push({
        id: strategyId,
        name,
        totalTrades: strategyTrades.length,
        wins,
        losses,
        winRate:
          strategyTrades.length > 0
            ? Math.round((wins / strategyTrades.length) * 100 * 10) / 10
            : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        avgPnl: Math.round(avgPnl * 100) / 100,
        totalRRx: Math.round(totalRRx * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossLoss: Math.round(grossLoss * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
      });
    });

    stats.sort((a, b) => b.totalPnl - a.totalPnl);
    return stats;
  }, [trades, strategies]);

  const totals = useMemo(() => {
    return strategyStats.reduce(
      (acc, s) => ({
        totalTrades: acc.totalTrades + s.totalTrades,
        wins: acc.wins + s.wins,
        losses: acc.losses + s.losses,
        totalPnl: acc.totalPnl + s.totalPnl,
        totalRRx: acc.totalRRx + s.totalRRx,
        grossProfit: acc.grossProfit + s.grossProfit,
        grossLoss: acc.grossLoss + s.grossLoss,
      }),
      {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
        totalRRx: 0,
        grossProfit: 0,
        grossLoss: 0,
      }
    );
  }, [strategyStats]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No trades found for the selected account type
        </CardContent>
      </Card>
    );
  }

  const overallWinRate =
    totals.totalTrades > 0
      ? Math.round((totals.wins / totals.totalTrades) * 100 * 10) / 10
      : 0;
  const overallProfitFactor =
    totals.grossLoss > 0
      ? Math.round((totals.grossProfit / totals.grossLoss) * 100) / 100
      : totals.grossProfit > 0
        ? Infinity
        : 0;

  return (
    <>
      {/* Win Rate Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Strategy Win Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategyStats.map((s) => (
            <PerformanceBar
              key={s.id}
              label={s.name}
              value={s.winRate}
              maxValue={100}
              trades={s.totalTrades}
              pnl={s.totalPnl}
              color="bg-blue"
            />
          ))}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Strategy Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Strategy</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Trades</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Wins</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Losses</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Win Rate</TableHead>
                  <TableHead className="text-right whitespace-nowrap">P&L</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Avg P&L</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total RRx</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Gross Profit</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Gross Loss</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Profit Factor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategyStats.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.totalTrades}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green">
                      {s.wins}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red">
                      {s.losses}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={s.winRate >= 50 ? "text-green" : "text-red"}
                      >
                        {s.winRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span
                        className={
                          s.totalPnl >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {formatPnl(s.totalPnl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={s.avgPnl >= 0 ? "text-green" : "text-red"}
                      >
                        {formatPnl(s.avgPnl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          s.totalRRx >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {s.totalRRx >= 0 ? "+" : ""}
                        {s.totalRRx.toFixed(2)}R
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-green">
                      +${s.grossProfit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red">
                      -${s.grossLoss.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          s.profitFactor >= 1 ? "text-green" : "text-red"
                        }
                      >
                        {s.profitFactor === Infinity
                          ? "∞"
                          : s.profitFactor.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.totalTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green">
                    {totals.wins}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red">
                    {totals.losses}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        overallWinRate >= 50 ? "text-green" : "text-red"
                      }
                    >
                      {overallWinRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    <span
                      className={
                        totals.totalPnl >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {formatPnl(totals.totalPnl)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        totals.totalRRx >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {totals.totalRRx >= 0 ? "+" : ""}
                      {totals.totalRRx.toFixed(2)}R
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-green">
                    +${totals.grossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red">
                    -${totals.grossLoss.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        overallProfitFactor >= 1 ? "text-green" : "text-red"
                      }
                    >
                      {overallProfitFactor === Infinity
                        ? "∞"
                        : overallProfitFactor.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
