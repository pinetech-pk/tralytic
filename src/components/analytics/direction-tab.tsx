"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceBar } from "@/components/charts/performance-bar";
import {
  BreakdownTable,
  computeBreakdownStats,
  formatPnl,
  type BreakdownRow,
  type BreakdownStats,
} from "@/components/analytics/breakdown-table";
import type { Trade } from "@/lib/types/database";

interface DirectionTabProps {
  trades: Trade[];
}

const DIRECTIONS = ["LONG", "SHORT"] as const;
type Direction = (typeof DIRECTIONS)[number];

const DIRECTION_COLORS: Record<Direction, string> = {
  LONG: "bg-green",
  SHORT: "bg-red",
};

/** Below this, a gap between the two sides is noise rather than a bias. */
const THIN_SAMPLE = 20;

function DirectionCard({
  direction,
  stats,
  isBetter,
}: {
  direction: Direction;
  stats: BreakdownStats;
  isBetter: boolean;
}) {
  const isLong = direction === "LONG";
  const Icon = isLong ? TrendingUp : TrendingDown;

  return (
    <Card className={isBetter ? "border-green/40" : undefined}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {direction}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.totalTrades}{" "}
              {stats.totalTrades === 1 ? "trade" : "trades"}
            </p>
          </div>
          <Icon
            className={`h-5 w-5 shrink-0 ${isLong ? "text-green" : "text-red"}`}
          />
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
          <p className="text-xs text-muted-foreground mt-0.5">per trade</p>
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
            <p className="text-xs text-muted-foreground">P&amp;L</p>
            <p
              className={`font-mono font-medium ${
                stats.totalPnl >= 0 ? "text-green" : "text-red"
              }`}
            >
              {formatPnl(stats.totalPnl)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DirectionTab({ trades }: DirectionTabProps) {
  const byDirection = useMemo(() => {
    // Both sides are always listed, even at zero, because the absence of one
    // is itself the finding on a page meant to compare them.
    return DIRECTIONS.map((direction) => ({
      direction,
      stats: computeBreakdownStats(
        trades.filter((t) => t.direction === direction)
      ),
    }));
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

  const traded = byDirection.filter((d) => d.stats.totalTrades > 0);

  // Expectancy per unit of risk, not total P&L: one side having run more
  // often should not make it look like the better side.
  const best =
    traded.length === 2
      ? traded.reduce((a, b) =>
          b.stats.rrxPerTrade > a.stats.rrxPerTrade ? b : a
        )
      : null;

  const gap =
    traded.length === 2
      ? Math.abs(
          traded[0].stats.rrxPerTrade - traded[1].stats.rrxPerTrade
        )
      : null;

  const thinSample = traded.some((d) => d.stats.totalTrades < THIN_SAMPLE);

  const rows: BreakdownRow[] = traded.map(({ direction, stats }) => ({
    key: direction,
    label: (
      <span className={direction === "LONG" ? "text-green" : "text-red"}>
        {direction}
      </span>
    ),
    stats,
  }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byDirection.map(({ direction, stats }) => (
          <DirectionCard
            key={direction}
            direction={direction}
            stats={stats}
            isBetter={best?.direction === direction}
          />
        ))}
      </div>

      {best && gap !== null && (
        <p className="text-sm text-muted-foreground">
          {gap < 0.01 ? (
            <>Both sides are running at the same expectancy per trade.</>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {best.direction}
              </span>{" "}
              is ahead by {gap.toFixed(2)}R per trade.
            </>
          )}
          {thinSample && (
            <> Thin sample — under {THIN_SAMPLE} trades on a side is not a bias yet.</>
          )}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Direction Win Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {traded.map(({ direction, stats }) => (
            <PerformanceBar
              key={direction}
              label={direction}
              value={stats.winRate}
              maxValue={100}
              trades={stats.totalTrades}
              pnl={stats.totalPnl}
              color={DIRECTION_COLORS[direction]}
            />
          ))}
        </CardContent>
      </Card>

      <BreakdownTable
        title="Direction Performance Breakdown"
        groupLabel="Direction"
        rows={rows}
      />
    </>
  );
}
