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
import { winRate } from "@/lib/utils";
import { Trophy, Medal, AlertTriangle } from "lucide-react";

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
  rrxPerTrade: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
}

function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

/** Below this, a difference in expectancy is noise rather than a finding. */
const THIN_SAMPLE = 20;

function StrategyRankCard({
  stats,
  rank,
  behindBy,
}: {
  stats: StrategyStats;
  rank: number;
  behindBy: number | null;
}) {
  const best = rank === 0;
  return (
    <Card className={best ? "border-green/40" : undefined}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {best ? "Best by RRx per trade" : "Runner-up"}
            </p>
            <p className="font-semibold truncate mt-0.5">{stats.name}</p>
          </div>
          {best ? (
            <Trophy className="h-5 w-5 text-green shrink-0" />
          ) : (
            <Medal className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>

        <div>
          <p
            className={`text-3xl font-bold font-mono ${
              stats.rrxPerTrade >= 0 ? "text-green" : "text-red"
            }`}
          >
            {stats.rrxPerTrade >= 0 ? "+" : ""}
            {stats.rrxPerTrade.toFixed(2)}R
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            per trade across {stats.totalTrades}{" "}
            {stats.totalTrades === 1 ? "trade" : "trades"}
            {behindBy !== null && behindBy > 0 && (
              <> · {behindBy.toFixed(2)}R behind</>
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total RRx</p>
            <p
              className={`font-mono font-medium ${
                stats.totalRRx >= 0 ? "text-green" : "text-red"
              }`}
            >
              {stats.totalRRx >= 0 ? "+" : ""}
              {stats.totalRRx.toFixed(2)}R
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-mono font-medium">{stats.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit Factor</p>
            <p className="font-mono font-medium">
              {stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)}
            </p>
          </div>
        </div>

        {stats.totalTrades < THIN_SAMPLE && (
          <p className="text-xs text-yellow flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Thin sample — {stats.totalTrades} of {THIN_SAMPLE} trades before
            this means much.
          </p>
        )}
      </CardContent>
    </Card>
  );
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
        winRate: Math.round(winRate(wins, losses) * 10) / 10,
        totalPnl: Math.round(totalPnl * 100) / 100,
        avgPnl: Math.round(avgPnl * 100) / 100,
        totalRRx: Math.round(totalRRx * 100) / 100,
        rrxPerTrade:
          strategyTrades.length > 0
            ? Math.round((totalRRx / strategyTrades.length) * 100) / 100
            : 0,
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

  // Decided trades only, matching every other win rate in the app.
  const overallWinRate = Math.round(winRate(totals.wins, totals.losses) * 10) / 10;

  // Ranked on RRx per trade rather than total P&L: expectancy per unit of risk
  // is what says which system to keep, independent of how often it ran.
  // "No Strategy" is excluded — it is a bucket, not something to choose.
  const ranked = [...strategyStats]
    .filter((s) => s.id !== "__none__")
    .sort((a, b) => b.rrxPerTrade - a.rrxPerTrade);
  const overallProfitFactor =
    totals.grossLoss > 0
      ? Math.round((totals.grossProfit / totals.grossLoss) * 100) / 100
      : totals.grossProfit > 0
        ? Infinity
        : 0;

  return (
    <>
      {/* Ranking */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ranked.slice(0, 2).map((s, i) => (
            <StrategyRankCard
              key={s.id}
              stats={s}
              rank={i}
              behindBy={i === 1 ? ranked[0].rrxPerTrade - s.rrxPerTrade : null}
            />
          ))}
        </div>
      )}

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
