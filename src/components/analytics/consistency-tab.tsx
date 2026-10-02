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

interface ConsistencyTabProps {
  accountIds?: string[];
  includeArchived?: boolean;
  filters?: PerformanceFilters;
}

/**
 * Period-over-period comparison. The question is not "how am I doing" but
 * "is it holding up", so this groups by its own weeks or months rather than
 * the page's date range.
 */
export function ConsistencyTab({
  accountIds,
  includeArchived,
  filters,
}: ConsistencyTabProps) {
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

  const periodLabel = periodType === "weekly" ? "Weeks" : "Months";
  const tradedLabel = periodType === "weekly" ? "weeks" : "months";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[180px]">
          <Select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>
        <div className="w-[150px]">
          <Select
            value={String(numPeriods)}
            onChange={(e) => setNumPeriods(Number(e.target.value) as NumPeriods)}
            options={[
              { value: "12", label: `Last 12 ${periodLabel}` },
              { value: "24", label: `Last 24 ${periodLabel}` },
            ]}
          />
        </div>
        {!loading && !error && (
          <p className="text-xs text-muted-foreground">
            {summary.periodsWithData} of {data.length} {tradedLabel} traded
            {periodType === "weekly" && " · ISO weeks (Mon–Sun)"}
          </p>
        )}
      </div>

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
          {/* How many traded periods were green — the consistency question. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ConsistencyCard
              label={`Profitable ${periodLabel}`}
              value={`${summary.totalWinningWeeks} / ${summary.periodsWithData}`}
              tone="green"
            />
            <ConsistencyCard
              label={`Losing ${periodLabel}`}
              value={`${summary.totalLosingWeeks} / ${summary.periodsWithData}`}
              tone="red"
            />
            <ConsistencyCard
              label="Best Period"
              value={
                summary.bestPeriod
                  ? `${summary.bestPeriod.pnl >= 0 ? "+$" : "-$"}${Math.abs(summary.bestPeriod.pnl).toFixed(2)}`
                  : "—"
              }
              sub={summary.bestPeriod?.label}
              tone="green"
            />
            <ConsistencyCard
              label="Worst Period"
              value={
                summary.worstPeriod
                  ? `${summary.worstPeriod.pnl >= 0 ? "+$" : "-$"}${Math.abs(summary.worstPeriod.pnl).toFixed(2)}`
                  : "—"
              }
              sub={summary.worstPeriod?.label}
              tone="red"
            />
          </div>

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
    </div>
  );
}

function ConsistencyCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "red";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p
          className={`text-lg font-bold font-mono mt-0.5 ${
            tone === "green" ? "text-green" : tone === "red" ? "text-red" : ""
          }`}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
