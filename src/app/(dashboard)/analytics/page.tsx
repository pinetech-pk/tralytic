"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/charts/equity-curve";
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart";
import { WinLossPie } from "@/components/charts/win-loss-pie";
import { PerformanceBar } from "@/components/charts/performance-bar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PerformanceTab } from "@/components/analytics/performance-tab";

// Extended demo data for analytics
const monthlyData = [
  { trade: 1, equity: 100, pnl: 0 },
  { trade: 10, equity: 102.5, pnl: 2.5 },
  { trade: 20, equity: 104.8, pnl: 2.3 },
  { trade: 30, equity: 107.2, pnl: 2.4 },
  { trade: 40, equity: 108.9, pnl: 1.7 },
  { trade: 50, equity: 111.5, pnl: 2.6 },
  { trade: 60, equity: 113.2, pnl: 1.7 },
  { trade: 70, equity: 114.8, pnl: 1.6 },
  { trade: 80, equity: 116.1, pnl: 1.3 },
  { trade: 90, equity: 117.9, pnl: 1.8 },
  { trade: 100, equity: 119.5, pnl: 1.6 },
];

const monthlyPnL = [
  { date: "Oct", pnl: 4.50, trades: 25 },
  { date: "Nov", pnl: 6.20, trades: 35 },
  { date: "Dec", pnl: 8.80, trades: 40 },
];

const directionStats = [
  { name: "Long", winRate: 65, trades: 65, pnl: 12.50, color: "bg-green" },
  { name: "Short", winRate: 55, trades: 35, pnl: 7.00, color: "bg-red" },
];

const strategyStats = [
  { name: "CCM + Trix", winRate: 68, trades: 45, pnl: 9.80 },
  { name: "Trix Ribbon Divergence", winRate: 58, trades: 30, pnl: 5.20 },
  { name: "CCM + RSI Midpoints", winRate: 55, trades: 25, pnl: 4.50 },
];

const sessionStats = [
  { name: "New York", winRate: 67, trades: 55, pnl: 11.20, color: "bg-green" },
  { name: "London", winRate: 60, trades: 30, pnl: 5.50, color: "bg-blue" },
  { name: "Asian", winRate: 50, trades: 15, pnl: 2.80, color: "bg-purple" },
];

const riskStats = {
  avgRiskPercent: 0.12,
  avgRiskAmount: 0.12,
  avgRR: 2.1,
  totalRisk: 12.50,
  maxDrawdown: 2.35,
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics"
        description="Deep dive into your trading performance"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="strategy">By Strategy</TabsTrigger>
            <TabsTrigger value="session">By Session</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EquityCurve data={monthlyData} title="3-Month Equity Curve" />
              <DailyPnLChart data={monthlyPnL} title="Monthly P&L" />
            </div>

            {/* Win/Loss and Direction */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WinLossPie wins={62} losses={38} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Direction Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {directionStats.map((stat) => (
                    <PerformanceBar
                      key={stat.name}
                      label={stat.name}
                      value={stat.winRate}
                      maxValue={100}
                      trades={stat.trades}
                      pnl={stat.pnl}
                      color={stat.color}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="font-mono font-medium">100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-mono font-medium text-green">62%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <span className="font-mono font-medium">1.85</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg R:R</span>
                    <span className="font-mono font-medium">2.1R</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Best Trade</span>
                    <span className="font-mono font-medium text-green">+$1.25</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Worst Trade</span>
                    <span className="font-mono font-medium text-red">-$0.45</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <PerformanceTab />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {strategyStats.map((strategy) => (
                  <div key={strategy.name} className="space-y-2">
                    <PerformanceBar
                      label={strategy.name}
                      value={strategy.winRate}
                      maxValue={100}
                      trades={strategy.trades}
                      pnl={strategy.pnl}
                      color="bg-blue"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="session" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {sessionStats.map((session) => (
                  <div key={session.name} className="space-y-2">
                    <PerformanceBar
                      label={session.name}
                      value={session.winRate}
                      maxValue={100}
                      trades={session.trades}
                      pnl={session.pnl}
                      color={session.color}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Avg Risk %</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {riskStats.avgRiskPercent.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Avg Risk Amount</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    ${riskStats.avgRiskAmount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Average R:R</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {riskStats.avgRR.toFixed(1)}R
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-red">
                    ${riskStats.maxDrawdown.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
