"use client";

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
import { RRX_CELL } from "@/components/analytics/rrx";
import type { Trade } from "@/lib/types/database";
import { winRate } from "@/lib/utils";

/**
 * Session, Strategy and Direction all ask the same question of a different
 * grouping, so the maths and the table live here once. Each tab supplies the
 * buckets and keeps what is specific to it — its own colours, its ranking
 * cards — above the table.
 */

export interface BreakdownStats {
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeBreakdownStats(trades: Trade[]): BreakdownStats {
  // is_winner is NULL for break-even and for trades with no result yet, so
  // neither counts as a win or a loss.
  const wins = trades.filter((t) => t.is_winner === true).length;
  const losses = trades.filter((t) => t.is_winner === false).length;

  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const totalRRx = trades.reduce(
    (acc, t) => acc + (t.risk_reward_actual || 0),
    0
  );
  const grossProfit = trades.reduce(
    (acc, t) => acc + (t.pnl && t.pnl > 0 ? t.pnl : 0),
    0
  );
  const grossLoss = Math.abs(
    trades.reduce((acc, t) => acc + (t.pnl && t.pnl < 0 ? t.pnl : 0), 0)
  );

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: Math.round(winRate(wins, losses) * 10) / 10,
    totalPnl: round2(totalPnl),
    avgPnl: round2(trades.length > 0 ? totalPnl / trades.length : 0),
    totalRRx: round2(totalRRx),
    rrxPerTrade: round2(trades.length > 0 ? totalRRx / trades.length : 0),
    grossProfit: round2(grossProfit),
    grossLoss: round2(grossLoss),
    profitFactor: round2(
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    ),
  };
}

export interface BreakdownRow {
  key: string;
  /** A node, so a tab can show a badge rather than plain text. */
  label: React.ReactNode;
  stats: BreakdownStats;
}

export function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function formatRRx(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

/** Totals are summed from the rows, so they always agree with what is shown. */
function sumRows(rows: BreakdownRow[]): BreakdownStats {
  const totals = rows.reduce(
    (acc, { stats }) => ({
      totalTrades: acc.totalTrades + stats.totalTrades,
      wins: acc.wins + stats.wins,
      losses: acc.losses + stats.losses,
      totalPnl: acc.totalPnl + stats.totalPnl,
      totalRRx: acc.totalRRx + stats.totalRRx,
      grossProfit: acc.grossProfit + stats.grossProfit,
      grossLoss: acc.grossLoss + stats.grossLoss,
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

  return {
    ...totals,
    totalPnl: round2(totals.totalPnl),
    totalRRx: round2(totals.totalRRx),
    grossProfit: round2(totals.grossProfit),
    grossLoss: round2(totals.grossLoss),
    // Decided trades only, matching every other win rate in the app.
    winRate: Math.round(winRate(totals.wins, totals.losses) * 10) / 10,
    avgPnl: round2(
      totals.totalTrades > 0 ? totals.totalPnl / totals.totalTrades : 0
    ),
    rrxPerTrade: round2(
      totals.totalTrades > 0 ? totals.totalRRx / totals.totalTrades : 0
    ),
    profitFactor: round2(
      totals.grossLoss > 0
        ? totals.grossProfit / totals.grossLoss
        : totals.grossProfit > 0
          ? Infinity
          : 0
    ),
  };
}

interface BreakdownTableProps {
  title: string;
  /** Header for the grouping column: "Session", "Strategy", "Direction". */
  groupLabel: string;
  rows: BreakdownRow[];
}

export function BreakdownTable({
  title,
  groupLabel,
  rows,
}: BreakdownTableProps) {
  const totals = sumRows(rows);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{groupLabel}</TableHead>
                <TableHead className="text-right whitespace-nowrap">Trades</TableHead>
                <TableHead className="text-right whitespace-nowrap">Wins</TableHead>
                <TableHead className="text-right whitespace-nowrap">Losses</TableHead>
                <TableHead className="text-right whitespace-nowrap">Win Rate</TableHead>
                <TableHead className="text-right whitespace-nowrap">P&amp;L</TableHead>
                <TableHead className={`text-right whitespace-nowrap ${RRX_CELL}`}>
                  Total RRx
                </TableHead>
                <TableHead className={`text-right whitespace-nowrap ${RRX_CELL}`}>
                  RRx / Trade
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Avg P&amp;L</TableHead>
                <TableHead className="text-right whitespace-nowrap">Gross Profit</TableHead>
                <TableHead className="text-right whitespace-nowrap">Gross Loss</TableHead>
                <TableHead className="text-right whitespace-nowrap">Profit Factor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ key, label, stats }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {label}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stats.totalTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green">
                    {stats.wins}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red">
                    {stats.losses}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={stats.winRate >= 50 ? "text-green" : "text-red"}
                    >
                      {stats.winRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    <span
                      className={stats.totalPnl >= 0 ? "text-green" : "text-red"}
                    >
                      {formatPnl(stats.totalPnl)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-bold ${RRX_CELL}`}
                  >
                    <span
                      className={stats.totalRRx >= 0 ? "text-green" : "text-red"}
                    >
                      {formatRRx(stats.totalRRx)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-bold ${RRX_CELL}`}
                  >
                    <span
                      className={
                        stats.rrxPerTrade >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {formatRRx(stats.rrxPerTrade)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={stats.avgPnl >= 0 ? "text-green" : "text-red"}
                    >
                      {formatPnl(stats.avgPnl)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-green">
                    +${stats.grossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red">
                    -${stats.grossLoss.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        stats.profitFactor >= 1 ? "text-green" : "text-red"
                      }
                    >
                      {stats.profitFactor === Infinity
                        ? "∞"
                        : stats.profitFactor.toFixed(2)}
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
                    className={totals.winRate >= 50 ? "text-green" : "text-red"}
                  >
                    {totals.winRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  <span
                    className={totals.totalPnl >= 0 ? "text-green" : "text-red"}
                  >
                    {formatPnl(totals.totalPnl)}
                  </span>
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-bold ${RRX_CELL}`}
                >
                  <span
                    className={totals.totalRRx >= 0 ? "text-green" : "text-red"}
                  >
                    {formatRRx(totals.totalRRx)}
                  </span>
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-bold ${RRX_CELL}`}
                >
                  <span
                    className={
                      totals.rrxPerTrade >= 0 ? "text-green" : "text-red"
                    }
                  >
                    {formatRRx(totals.rrxPerTrade)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">—</TableCell>
                <TableCell className="text-right font-mono text-green">
                  +${totals.grossProfit.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-red">
                  -${totals.grossLoss.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span
                    className={
                      totals.profitFactor >= 1 ? "text-green" : "text-red"
                    }
                  >
                    {totals.profitFactor === Infinity
                      ? "∞"
                      : totals.profitFactor.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
