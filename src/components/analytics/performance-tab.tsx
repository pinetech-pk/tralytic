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
} from "@/hooks/use-performance-data";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Trophy,
  AlertTriangle,
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

interface PerformanceTabProps {
  accountIds?: string[];
}

export function PerformanceTab({ accountIds }: PerformanceTabProps) {
  const {
    data,
    summary,
    loading,
    error,
    periodType,
    numPeriods,
    setPeriodType,
    setNumPeriods,
  } = usePerformanceData(accountIds);

  const periodLabel = periodType === "weekly" ? "Weeks" : "Months";

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

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <StatCard
              label="Total Trades"
              value={String(summary.totalTrades)}
              icon={BarChart3}
            />
            <StatCard
              label="Total P&L"
              value={`${summary.totalPnl >= 0 ? "+$" : "-$"}${Math.abs(summary.totalPnl).toFixed(2)}`}
              icon={summary.totalPnl >= 0 ? TrendingUp : TrendingDown}
              valueColor={summary.totalPnl >= 0 ? "text-green" : "text-red"}
            />
            <StatCard
              label="Win Rate"
              value={`${summary.overallWinRate.toFixed(1)}%`}
              icon={Target}
              valueColor={
                summary.overallWinRate >= 50 ? "text-green" : "text-red"
              }
            />
            <StatCard
              label={`Winning ${periodLabel}`}
              value={`${summary.totalWinningWeeks} / ${data.length}`}
              icon={Trophy}
              valueColor="text-green"
            />
            <StatCard
              label={`Losing ${periodLabel}`}
              value={`${summary.totalLosingWeeks} / ${data.length}`}
              icon={AlertTriangle}
              valueColor="text-red"
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
              label="Profit Factor"
              value={
                summary.profitFactor === Infinity
                  ? "∞"
                  : summary.profitFactor.toFixed(2)
              }
              icon={BarChart3}
              valueColor={
                summary.profitFactor >= 1 ? "text-green" : "text-red"
              }
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformancePnLChart
              data={data}
              title={`${periodType === "weekly" ? "Weekly" : "Monthly"} P&L`}
            />
            <PerformanceCumulativeChart
              data={data}
              title="Cumulative P&L"
            />
          </div>

          {/* Table */}
          <PerformanceTable data={data} periodType={periodType} />
        </>
      )}
    </div>
  );
}
