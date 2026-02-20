"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PeriodicPerformanceRow } from "@/lib/types/database";

interface PerformanceCumulativeChartProps {
  data: PeriodicPerformanceRow[];
  title?: string;
}

export function PerformanceCumulativeChart({
  data,
  title = "Cumulative P&L",
}: PerformanceCumulativeChartProps) {
  let cumulative = 0;
  const chartData = data.map((d) => {
    cumulative += d.total_pnl;
    return {
      label: d.period_label,
      cumPnl: Math.round(cumulative * 100) / 100,
      periodPnl: d.total_pnl,
    };
  });

  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].cumPnl >= 0;
  const color = isPositive ? "#10b981" : "#ef4444";
  const gradientId = "performanceCumGradient";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No performance data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
                formatter={(value, name) => {
                  if (name === "cumPnl" && typeof value === "number") {
                    return [`$${value.toFixed(2)}`, "Cumulative P&L"];
                  }
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="cumPnl"
                stroke={color}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
