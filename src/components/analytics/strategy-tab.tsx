"use client";

import { useMemo } from "react";
import { Trophy, Medal, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceBar } from "@/components/charts/performance-bar";
import {
  BreakdownTable,
  computeBreakdownStats,
  type BreakdownRow,
  type BreakdownStats,
} from "@/components/analytics/breakdown-table";
import type { Trade, Strategy } from "@/lib/types/database";

interface StrategyTabProps {
  trades: Trade[];
  strategies: Strategy[];
}

interface StrategyEntry {
  id: string;
  name: string;
  stats: BreakdownStats;
}

/** Below this, a difference in expectancy is noise rather than a finding. */
const THIN_SAMPLE = 20;

/** Trades with no strategy are a bucket, not something that can be chosen. */
const NO_STRATEGY = "__none__";

function StrategyRankCard({
  entry,
  rank,
  behindBy,
}: {
  entry: StrategyEntry;
  rank: number;
  behindBy: number | null;
}) {
  const best = rank === 0;
  const { stats } = entry;

  return (
    <Card className={best ? "border-green/40" : undefined}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {best ? "Best by RRx per trade" : "Runner-up"}
            </p>
            <p className="font-semibold truncate mt-0.5">{entry.name}</p>
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
      const key = t.strategy_id || NO_STRATEGY;
      if (!strategyMap.has(key)) strategyMap.set(key, []);
      strategyMap.get(key)!.push(t);
    });

    const entries: StrategyEntry[] = [];
    strategyMap.forEach((strategyTrades, strategyId) => {
      entries.push({
        id: strategyId,
        name:
          strategies.find((s) => s.id === strategyId)?.name || "No Strategy",
        stats: computeBreakdownStats(strategyTrades),
      });
    });

    entries.sort((a, b) => b.stats.totalPnl - a.stats.totalPnl);
    return entries;
  }, [trades, strategies]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No trades found for the selected account type
        </CardContent>
      </Card>
    );
  }

  // Ranked on RRx per trade rather than total P&L: expectancy per unit of risk
  // is what says which system to keep, independent of how often it ran.
  const ranked = strategyStats
    .filter((s) => s.id !== NO_STRATEGY)
    .sort((a, b) => b.stats.rrxPerTrade - a.stats.rrxPerTrade);

  const rows: BreakdownRow[] = strategyStats.map(({ id, name, stats }) => ({
    key: id,
    label: name,
    stats,
  }));

  return (
    <>
      {ranked.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ranked.slice(0, 2).map((entry, i) => (
            <StrategyRankCard
              key={entry.id}
              entry={entry}
              rank={i}
              behindBy={
                i === 1
                  ? ranked[0].stats.rrxPerTrade - entry.stats.rrxPerTrade
                  : null
              }
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Strategy Win Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategyStats.map(({ id, name, stats }) => (
            <PerformanceBar
              key={id}
              label={name}
              value={stats.winRate}
              maxValue={100}
              trades={stats.totalTrades}
              pnl={stats.totalPnl}
              color="bg-blue"
            />
          ))}
        </CardContent>
      </Card>

      <BreakdownTable
        title="Strategy Performance Breakdown"
        groupLabel="Strategy"
        rows={rows}
      />
    </>
  );
}
