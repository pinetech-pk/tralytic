"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PeriodicPerformanceRow } from "@/lib/types/database";

interface PerformancePnLChartProps {
  data: PeriodicPerformanceRow[];
  title?: string;
}

export function PerformancePnLChart({
  data,
  title = "Period P&L",
}: PerformancePnLChartProps) {
  const chartData = data.map((d) => ({
    label: d.period_label,
    pnl: d.total_pnl,
    trades: d.total_trades,
    winRate: d.win_rate,
  }));

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
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
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
                  if (name === "pnl" && typeof value === "number") {
                    return [`$${value.toFixed(2)}`, "P&L"];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => label}
              />
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
