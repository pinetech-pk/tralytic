"use client";

import { useState } from "react";
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
import { useRiskMetrics } from "@/hooks/use-risk-metrics";
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-lg" />
        ))}
      </div>
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

interface PerformanceTabProps {
  accountIds?: string[];
  includeArchived?: boolean;
  filters?: PerformanceFilters;
  /** Per-trade data for the risk metrics the period RPC cannot provide. */
  trades: Trade[];
}

type PerformanceView = "summary" | "breakdown";

export function PerformanceTab({
  accountIds,
  includeArchived,
  filters,
  trades,
}: PerformanceTabProps) {
  const {
    data,
    summary,
    loading,
    error,
    periodType,
    numPeriods,
    setPeriodType,
    setNumPeriods,
  } = usePerformanceData(accountIds, includeArchived, filters);

  const [view, setView] = useState<PerformanceView>("summary");
  const periodLabel = periodType === "weekly" ? "Weeks" : "Months";
  const risk = useRiskMetrics(trades);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-[160px]">
            <Select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              options={[
                { value: "weekly", label: "Weekly Performance" },
                { value: "monthly", label: "Monthly Performance" },
              ]}
            />
          </div>
          <div className="w-[140px]">
            <Select
              value={String(numPeriods)}
              onChange={(e) => setNumPeriods(Number(e.target.value) as NumPeriods)}
              options={[
                { value: "12", label: `Last 12 ${periodLabel}` },
                { value: "24", label: `Last 24 ${periodLabel}` },
              ]}
            />
          </div>
        </div>
        {!loading && data.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {data.length} {data.length === 1 ? "period" : "periods"} with
            data &middot; ISO Week Standard (Mon&ndash;Sun)
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red/30 bg-red-bg">
          <CardContent className="p-4">
            <p className="text-sm text-red">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* View switch */}
      {!loading && !error && (
        <div className="inline-flex rounded-lg border p-1">
          {(
            [
              ["summary", "Performance & Risk"],
              ["breakdown", "Performance Breakdown"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
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
      )}

      {/* Content */}
      {!loading && !error && view === "summary" && (
        <>
          {/* RRx first — it is the metric the journal is built around. */}
          <StatGroup title="Risk-Adjusted Return">
            <StatCard
              label="Total RRx"
              value={`${summary.totalRRx >= 0 ? "+" : ""}${summary.totalRRx.toFixed(2)}R`}
              icon={Target}
              valueColor={summary.totalRRx >= 0 ? "text-green" : "text-red"}
            />
            <StatCard
              label="RRx per Trade"
              value={`${summary.rrxPerTrade >= 0 ? "+" : ""}${summary.rrxPerTrade.toFixed(2)}R`}
              icon={Gauge}
              valueColor={summary.rrxPerTrade >= 0 ? "text-green" : "text-red"}
            />
            <StatCard
              label="Profit Factor"
              value={
                summary.profitFactor === Infinity
                  ? "∞"
                  : summary.profitFactor.toFixed(2)
              }
              icon={BarChart3}
              valueColor={summary.profitFactor >= 1 ? "text-green" : "text-red"}
            />
            <StatCard
              label="Total Trades"
              value={String(summary.totalTrades)}
              icon={Layers}
            />
          </StatGroup>

          <StatGroup title="Profit & Loss">
            <StatCard
              label="Total P&L"
              value={`${summary.totalPnl >= 0 ? "+$" : "-$"}${Math.abs(summary.totalPnl).toFixed(2)}`}
              icon={summary.totalPnl >= 0 ? TrendingUp : TrendingDown}
              valueColor={summary.totalPnl >= 0 ? "text-green" : "text-red"}
            />
            <StatCard
              label="Gross Profit"
              value={`+$${summary.grossProfit.toFixed(2)}`}
              icon={TrendingUp}
              valueColor="text-green"
            />
            <StatCard
              label="Gross Loss"
              value={`-$${summary.grossLoss.toFixed(2)}`}
              icon={TrendingDown}
              valueColor="text-red"
            />
            <StatCard
              label="Max Drawdown"
              value={`-$${risk.maxDrawdown.toFixed(2)}`}
              icon={AlertTriangle}
              valueColor={risk.maxDrawdown > 0 ? "text-red" : undefined}
            />
          </StatGroup>

          <StatGroup
            title="Outcomes"
            note="win rate counts decided trades only"
          >
            <StatCard
              label="Win Rate"
              value={`${summary.overallWinRate.toFixed(1)}%`}
              icon={Target}
              valueColor={summary.overallWinRate >= 50 ? "text-green" : "text-red"}
            />
            <StatCard
              label="Break-even Trades"
              value={String(risk.breakevenTrades)}
              icon={Minus}
            />
            <StatCard
              label={`Winning ${periodLabel}`}
              value={`${summary.totalWinningWeeks} / ${summary.periodsWithData}`}
              icon={Trophy}
              valueColor="text-green"
            />
            <StatCard
              label={`Losing ${periodLabel}`}
              value={`${summary.totalLosingWeeks} / ${summary.periodsWithData}`}
              icon={AlertTriangle}
              valueColor="text-red"
            />
          </StatGroup>

          <StatGroup
            title="Risk & Streaks"
            note="across the trades matching the filters above"
          >
            <StatCard
              label="Avg Risk %"
              value={`${risk.avgRiskPercent.toFixed(2)}%`}
              icon={Shield}
            />
            <StatCard
              label="Avg Risk Amount"
              value={`$${risk.avgRiskAmount.toFixed(2)}`}
              icon={Shield}
            />
            <StatCard
              label="Max Consecutive Wins"
              value={String(risk.maxConsecutiveWins)}
              icon={Trophy}
              valueColor="text-green"
            />
            <StatCard
              label="Max Consecutive Losses"
              value={String(risk.maxConsecutiveLosses)}
              icon={Zap}
              valueColor="text-red"
            />
            <StatCard
              label="Largest Win"
              value={`+$${risk.largestWin.toFixed(2)}`}
              icon={TrendingUp}
              valueColor="text-green"
            />
            <StatCard
              label="Largest Loss"
              value={`-$${Math.abs(risk.largestLoss).toFixed(2)}`}
              icon={TrendingDown}
              valueColor="text-red"
            />
            <StatCard
              label="Avg Win"
              value={`+$${risk.avgWin.toFixed(2)}`}
              icon={TrendingUp}
              valueColor="text-green"
            />
            <StatCard
              label="Avg Loss"
              value={`-$${Math.abs(risk.avgLoss).toFixed(2)}`}
              icon={TrendingDown}
              valueColor="text-red"
            />
          </StatGroup>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformancePnLChart
              data={data}
              title={`${periodType === "weekly" ? "Weekly" : "Monthly"} P&L`}
            />
            <PerformanceCumulativeChart data={data} title="Cumulative P&L" />
          </div>
        </>
      )}

      {!loading && !error && view === "breakdown" && (
        <PerformanceTable data={data} periodType={periodType} />
      )}
    </div>
  );
}
