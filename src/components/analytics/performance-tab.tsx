"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformancePnLChart } from "@/components/charts/performance-pnl-chart";
import { PerformanceCumulativeChart } from "@/components/charts/performance-cumulative-chart";
import { PerformanceTable } from "@/components/analytics/performance-table";
import {
  usePerformanceData,
  type PeriodType,
  type NumPeriods,
  type PerformanceFilters,
} from "@/hooks/use-performance-data";
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[380px] rounded-lg" />
        <Skeleton className="h-[380px] rounded-lg" />
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
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

export type PerformanceView = "summary" | "breakdown";

interface PerformanceTabProps {
  accountIds?: string[];
  includeArchived?: boolean;
  filters?: PerformanceFilters;
  /** Already scoped by the page-level Period filter. */
  trades: Trade[];
  view: PerformanceView;
  onViewChange: (view: PerformanceView) => void;
}

export function PerformanceTab({
  accountIds,
  includeArchived,
  filters,
  trades,
  view,
  onViewChange,
}: PerformanceTabProps) {
  const {
    data,
    loading,
    error,
    periodType,
    numPeriods,
    setPeriodType,
    setNumPeriods,
  } = usePerformanceData(accountIds, includeArchived, filters);

  // Summary reads only the filtered trades, so every card describes the same
  // window: whatever the Period selector at the top of the page says.
  const m = useTradeMetrics(trades);
  const periodLabel = periodType === "weekly" ? "Weeks" : "Months";

  return (
    <div className="space-y-6">
      {/* View switch, plus whichever controls belong to the active view */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border p-1">
          {(
            [
              ["summary", "Performance & Risk"],
              ["breakdown", "Performance Breakdown"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                view === id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* The breakdown compares consecutive periods, so it carries its own
            grouping rather than the page-level date range. */}
        {view === "breakdown" && (
          <>
            <div className="w-[180px]">
              <Select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                options={[
                  { value: "weekly", label: "Weekly Performance" },
                  { value: "monthly", label: "Monthly Performance" },
                ]}
              />
            </div>
            <div className="w-[150px]">
              <Select
                value={String(numPeriods)}
                onChange={(e) =>
                  setNumPeriods(Number(e.target.value) as NumPeriods)
                }
                options={[
                  { value: "12", label: `Last 12 ${periodLabel}` },
                  { value: "24", label: `Last 24 ${periodLabel}` },
                ]}
              />
            </div>
            {!loading && periodType === "weekly" && (
              <p className="text-xs text-muted-foreground">
                ISO Week Standard (Mon&ndash;Sun)
              </p>
            )}
          </>
        )}
      </div>

      {/* Performance & Risk */}
      {view === "summary" &&
        (trades.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
              No trades match the selected filters
            </CardContent>
          </Card>
        ) : (
          <>
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
          </>
        ))}

      {/* Performance Breakdown */}
      {view === "breakdown" && (
        <>
          {error && (
            <Card className="border-red/30 bg-red-bg">
              <CardContent className="p-4">
                <p className="text-sm text-red">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading && <LoadingSkeleton />}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformancePnLChart
                  data={data}
                  title={`${periodType === "weekly" ? "Weekly" : "Monthly"} P&L`}
                />
                <PerformanceCumulativeChart data={data} title="Cumulative P&L" />
              </div>
              <PerformanceTable data={data} periodType={periodType} />
            </>
          )}
        </>
      )}
    </div>
  );
}
