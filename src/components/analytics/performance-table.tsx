"use client";

import { useState } from "react";
import { winRate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PeriodicPerformanceRow } from "@/lib/types/database";
import type { PeriodType } from "@/hooks/use-performance-data";

interface PerformanceTableProps {
  data: PeriodicPerformanceRow[];
  periodType: PeriodType;
}

function formatPnl(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PerformanceTable({ data, periodType }: PerformanceTableProps) {
  const periodLabel = periodType === "weekly" ? "Week" : "Month";
  const [hideEmpty, setHideEmpty] = useState(true);

  // Calculate totals for footer
  const totals = data.reduce(
    (acc, row) => ({
      totalTrades: acc.totalTrades + row.total_trades,
      winningTrades: acc.winningTrades + row.winning_trades,
      losingTrades: acc.losingTrades + row.losing_trades,
      totalPnl: acc.totalPnl + row.total_pnl,
      longTrades: acc.longTrades + row.long_trades,
      shortTrades: acc.shortTrades + row.short_trades,
      totalRiskReward: acc.totalRiskReward + row.total_risk_reward,
      grossProfit: acc.grossProfit + row.gross_profit,
      grossLoss: acc.grossLoss + row.gross_loss,
    }),
    {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnl: 0,
      longTrades: 0,
      shortTrades: 0,
      totalRiskReward: 0,
      grossProfit: 0,
      grossLoss: 0,
    }
  );

  const overallProfitFactor =
    totals.grossLoss > 0
      ? Math.round((totals.grossProfit / totals.grossLoss) * 100) / 100
      : totals.grossProfit > 0
        ? Infinity
        : 0;

  // Decided trades only, matching every other win rate in the app.
  const overallWinRate =
    Math.round(winRate(totals.winningTrades, totals.losingTrades) * 100) / 100;

  // Index is kept from the full set so period numbering stays stable when
  // empty ones are hidden.
  const indexedRows = data.map((row, index) => ({ row, index }));
  const emptyCount = indexedRows.filter((r) => r.row.total_trades === 0).length;
  const visibleRows = hideEmpty
    ? indexedRows.filter((r) => r.row.total_trades > 0)
    : indexedRows;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">
          {periodType === "weekly" ? "Weekly" : "Monthly"} Performance Breakdown
        </CardTitle>
        {emptyCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
            />
            Hide {emptyCount} empty {emptyCount === 1 ? periodLabel.toLowerCase() : `${periodLabel.toLowerCase()}s`}
          </label>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No performance data available for this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{periodLabel}</TableHead>
                  <TableHead className="whitespace-nowrap">Date Range</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Trades</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Wins</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Losses</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Win Rate</TableHead>
                  <TableHead className="text-right whitespace-nowrap">P&L</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Avg P&L</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Best Trade</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Worst Trade</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Long</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Short</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total RRx</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Gross Profit</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Gross Loss</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Profit Factor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map(({ row, index }) =>
                  row.total_trades === 0 ? (
                    // A period with no trades has nothing to colour; a row of
                    // green and red zeros reads as data that is not there.
                    <TableRow key={row.period_key} className="opacity-60">
                      <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                        {periodType === "weekly"
                          ? `${periodLabel} ${index + 1}`
                          : row.period_label}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(row.period_start)} - {formatDate(row.period_end)}
                      </TableCell>
                      <TableCell
                        colSpan={14}
                        className="text-muted-foreground text-xs"
                      >
                        No trades
                      </TableCell>
                    </TableRow>
                  ) : (
                  <TableRow key={row.period_key}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {periodType === "weekly"
                        ? `Week ${index + 1}`
                        : row.period_label}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {formatDate(row.period_start)} - {formatDate(row.period_end)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.total_trades}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green">
                      {row.winning_trades}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red">
                      {row.losing_trades}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          row.win_rate >= 50 ? "text-green" : "text-red"
                        }
                      >
                        {row.win_rate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span
                        className={
                          row.total_pnl >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {formatPnl(row.total_pnl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          row.avg_pnl >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {formatPnl(row.avg_pnl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-green">
                      {formatPnl(row.largest_win)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red">
                      {formatPnl(row.largest_loss)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.long_trades}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.short_trades}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          row.total_risk_reward >= 0 ? "text-green" : "text-red"
                        }
                      >
                        {row.total_risk_reward >= 0 ? "+" : ""}
                        {row.total_risk_reward.toFixed(2)}R
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-green">
                      +${row.gross_profit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red">
                      -${row.gross_loss.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          row.profit_factor >= 1 ? "text-green" : "text-red"
                        }
                      >
                        {row.profit_factor >= 999
                          ? "∞"
                          : row.profit_factor.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                  )
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {data.length} {data.length === 1 ? "period" : "periods"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.totalTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green">
                    {totals.winningTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red">
                    {totals.losingTrades}
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
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.longTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.shortTrades}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={
                        totals.totalRiskReward >= 0 ? "text-green" : "text-red"
                      }
                    >
                      {totals.totalRiskReward >= 0 ? "+" : ""}
                      {totals.totalRiskReward.toFixed(2)}R
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
        )}
      </CardContent>
    </Card>
  );
}
