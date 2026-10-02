"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { winRate } from "@/lib/utils";

interface WinLossPieProps {
  wins: number;
  losses: number;
  breakeven?: number;
  title?: string;
}

export function WinLossPie({
  wins,
  losses,
  breakeven = 0,
  title = "Win/Loss Ratio",
}: WinLossPieProps) {
  // The ring shows the composition of every trade, but the headline stays
  // wins over decided trades — a break-even is not a loss.
  const rate = winRate(wins, losses).toFixed(1);

  const data = [
    { name: "Wins", value: wins, color: "#10b981" },
    { name: "Losses", value: losses, color: "#ef4444" },
    // Omitted at zero so the legend does not carry a dead entry.
    ...(breakeven > 0
      ? [{ name: "B/E", value: breakeven, color: "#64748b" }]
      : []),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value, entry) => (
                  <span className="text-sm text-muted-foreground">
                    {value}: {(entry.payload as { value: number }).value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-2xl font-bold">{rate}%</div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
