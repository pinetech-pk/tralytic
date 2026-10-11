"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceBar } from "@/components/charts/performance-bar";
import {
  BreakdownTable,
  computeBreakdownStats,
  type BreakdownRow,
} from "@/components/analytics/breakdown-table";
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

/** Trading-day order, not whichever session happened to be fetched first. */
const SESSION_ORDER = ["NY", "LO", "AS", "OTHER"];

interface SessionTabProps {
  trades: Trade[];
}

export function SessionTab({ trades }: SessionTabProps) {
  const sessionStats = useMemo(() => {
    const sessionMap = new Map<string, Trade[]>();

    trades.forEach((t) => {
      const key = t.session || "OTHER";
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(t);
    });

    return SESSION_ORDER.flatMap((session) => {
      const sessionTrades = sessionMap.get(session);
      if (!sessionTrades || sessionTrades.length === 0) return [];
      return [
        {
          session,
          label: SESSION_LABELS[session] || session,
          stats: computeBreakdownStats(sessionTrades),
        },
      ];
    });
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

  const rows: BreakdownRow[] = sessionStats.map(({ session, label, stats }) => ({
    key: session,
    label,
    stats,
  }));

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Session Win Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionStats.map(({ session, label, stats }) => (
            <PerformanceBar
              key={session}
              label={label}
              value={stats.winRate}
              maxValue={100}
              trades={stats.totalTrades}
              pnl={stats.totalPnl}
              color={SESSION_COLORS[session] || "bg-gray-500"}
            />
          ))}
        </CardContent>
      </Card>

      <BreakdownTable
        title="Session Performance Breakdown"
        groupLabel="Session"
        rows={rows}
      />
    </>
  );
}
