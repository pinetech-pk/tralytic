"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTradeMetrics } from "@/hooks/use-trade-metrics";
import type { Trade } from "@/lib/types/database";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Trophy,
  AlertTriangle,
  Gauge,
  Layers,
  Shield,
  Zap,
  Minus,
} from "lucide-react";

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

/** A labelled band of stat cards, so the numbers read as groups not a wall. */
function StatGroup({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {note && <span className="text-xs text-muted-foreground/70">{note}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

interface PerformanceTabProps {
  /** Already scoped by the page-level Period filter. */
  trades: Trade[];
}

export function PerformanceTab({ trades }: PerformanceTabProps) {
  // Every card derives from one filtered list, so they cannot disagree
  // about which window they describe.
  const m = useTradeMetrics(trades);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No trades match the selected filters
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* RRx first — it is the metric the journal is built around. */}
            <StatGroup title="Risk-Adjusted Return">
              <StatCard
                label="Total RRx"
                value={`${m.totalRRx >= 0 ? "+" : ""}${m.totalRRx.toFixed(2)}R`}
                icon={Target}
                valueColor={m.totalRRx >= 0 ? "text-green" : "text-red"}
              />
              <StatCard
                label="RRx per Trade"
                value={`${m.rrxPerTrade >= 0 ? "+" : ""}${m.rrxPerTrade.toFixed(2)}R`}
                icon={Gauge}
                valueColor={m.rrxPerTrade >= 0 ? "text-green" : "text-red"}
              />
              <StatCard
                label="Profit Factor"
                value={
                  m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2)
                }
                icon={BarChart3}
                valueColor={m.profitFactor >= 1 ? "text-green" : "text-red"}
              />
              <StatCard
                label="Total Trades"
                value={String(m.totalTrades)}
                icon={Layers}
              />
            </StatGroup>

            <StatGroup title="Profit & Loss">
              <StatCard
                label="Total P&L"
                value={`${m.totalPnl >= 0 ? "+$" : "-$"}${Math.abs(m.totalPnl).toFixed(2)}`}
                icon={m.totalPnl >= 0 ? TrendingUp : TrendingDown}
                valueColor={m.totalPnl >= 0 ? "text-green" : "text-red"}
              />
              <StatCard
                label="Gross Profit"
                value={`+$${m.grossProfit.toFixed(2)}`}
                icon={TrendingUp}
                valueColor="text-green"
              />
              <StatCard
                label="Gross Loss"
                value={`-$${m.grossLoss.toFixed(2)}`}
                icon={TrendingDown}
                valueColor="text-red"
              />
              <StatCard
                label="Max Drawdown"
                value={`-$${m.maxDrawdown.toFixed(2)}`}
                icon={AlertTriangle}
                valueColor={m.maxDrawdown > 0 ? "text-red" : undefined}
              />
            </StatGroup>

            <StatGroup
              title="Outcomes"
              note="win rate counts decided trades only"
            >
              <StatCard
                label="Win Rate"
                value={`${m.winRate.toFixed(1)}%`}
                icon={Target}
                valueColor={m.winRate >= 50 ? "text-green" : "text-red"}
              />
              <StatCard
                label="Wins"
                value={String(m.wins)}
                icon={Trophy}
                valueColor="text-green"
              />
              <StatCard
                label="Losses"
                value={String(m.losses)}
                icon={TrendingDown}
                valueColor="text-red"
              />
              <StatCard
                label="Break-even"
                value={String(m.breakevenTrades)}
                icon={Minus}
              />
            </StatGroup>

            <StatGroup title="Risk &amp; Streaks">
              <StatCard
                label="Avg Risk %"
                value={`${m.avgRiskPercent.toFixed(2)}%`}
                icon={Shield}
              />
              <StatCard
                label="Avg Risk Amount"
                value={`$${m.avgRiskAmount.toFixed(2)}`}
                icon={Shield}
              />
              <StatCard
                label="Max Consecutive Wins"
                value={String(m.maxConsecutiveWins)}
                icon={Trophy}
                valueColor="text-green"
              />
              <StatCard
                label="Max Consecutive Losses"
                value={String(m.maxConsecutiveLosses)}
                icon={Zap}
                valueColor="text-red"
              />
              <StatCard
                label="Largest Win"
                value={`+$${m.largestWin.toFixed(2)}`}
                icon={TrendingUp}
                valueColor="text-green"
              />
              <StatCard
                label="Largest Loss"
                value={`-$${Math.abs(m.largestLoss).toFixed(2)}`}
                icon={TrendingDown}
                valueColor="text-red"
              />
              <StatCard
                label="Avg Win"
                value={`+$${m.avgWin.toFixed(2)}`}
                icon={TrendingUp}
                valueColor="text-green"
              />
              <StatCard
                label="Avg Loss"
                value={`-$${Math.abs(m.avgLoss).toFixed(2)}`}
                icon={TrendingDown}
                valueColor="text-red"
              />
      </StatGroup>
    </div>
  );
}
