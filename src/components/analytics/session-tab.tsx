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
import type { Trade } from "@/lib/types/database";

const SESSION_LABELS: Record<string, string> = {
  AS: "Asian",
  LO: "London",
  NY: "New York",
  OTHER: "Other",
};

const SESSION_COLORS: Record<string, string> = {
  NY: "bg-green",
  LO: "bg-blue",
  AS: "bg-purple",
  OTHER: "bg-gray-500",
};

interface SessionTabProps {
  trades: Trade[];
}

interface SessionStats {
  session: string;
  label: string;
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

export function SessionTab({ trades }: SessionTabProps) {
  const sessionStats = useMemo(() => {
    const sessionMap = new Map<string, Trade[]>();

    trades.forEach((t) => {
      const key = t.session || "OTHER";
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(t);
    });

    const stats: SessionStats[] = [];
    const sessionOrder = ["NY", "LO", "AS", "OTHER"];

    sessionOrder.forEach((session) => {
      const sessionTrades = sessionMap.get(session);
      if (!sessionTrades || sessionTrades.length === 0) return;

      const wins = sessionTrades.filter((t) => t.is_winner === true).length;
      const losses = sessionTrades.filter((t) => t.is_winner === false).length;
      const totalPnl = sessionTrades.reduce(
        (acc, t) => acc + (t.pnl || 0),
        0
      );
      const avgPnl =
        sessionTrades.length > 0 ? totalPnl / sessionTrades.length : 0;
      const totalRRx = sessionTrades.reduce(
        (acc, t) => acc + (t.risk_reward_actual || 0),
        0
      );
      const grossProfit = sessionTrades.reduce(
        (acc, t) => acc + (t.pnl && t.pnl > 0 ? t.pnl : 0),
        0
      );
      const grossLoss = Math.abs(
        sessionTrades.reduce(
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
        session,
        label: SESSION_LABELS[session] || session,
        totalTrades: sessionTrades.length,
        wins,
        losses,
        winRate:
          sessionTrades.length > 0
            ? Math.round((wins / sessionTrades.length) * 100 * 10) / 10
            : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        avgPnl: Math.round(avgPnl * 100) / 100,
        totalRRx: Math.round(totalRRx * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossLoss: Math.round(grossLoss * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
      });
    });

    return stats;
  }, [trades]);

  const totals = useMemo(() => {
    return sessionStats.reduce(
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
  }, [sessionStats]);

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
            Session Win Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionStats.map((s) => (
            <PerformanceBar
              key={s.session}
              label={s.label}
              value={s.winRate}
              maxValue={100}
              trades={s.totalTrades}
              pnl={s.totalPnl}
              color={SESSION_COLORS[s.session] || "bg-gray-500"}
            />
          ))}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Session Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Session</TableHead>
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
                {sessionStats.map((s) => (
                  <TableRow key={s.session}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {s.label}
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
