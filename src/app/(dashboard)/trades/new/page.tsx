"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Calculator } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { TradeInsert, Account, Strategy } from "@/lib/types/database";

const directionOptions = [
  { value: "LONG", label: "Long" },
  { value: "SHORT", label: "Short" },
];

const sessionOptions = [
  { value: "AS", label: "Asian" },
  { value: "LO", label: "London" },
  { value: "NY", label: "New York" },
  { value: "OTHER", label: "Other" },
];

const marketOptions = [
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "stocks", label: "Stocks" },
  { value: "futures", label: "Futures" },
  { value: "options", label: "Options" },
];

const timeframeOptions = [
  { value: "1m", label: "1m" },
  { value: "2m", label: "2m" },
  { value: "3m", label: "3m" },
  { value: "5m", label: "5m" },
  { value: "10m", label: "10m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "2h", label: "2h" },
  { value: "4h", label: "4h" },
  { value: "6h", label: "6h" },
  { value: "12h", label: "12h" },
  { value: "1d", label: "1D" },
  { value: "3d", label: "3D" },
];

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function NewTradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [accountSize, setAccountSize] = useState<number>(0);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    security: "",
    market: "crypto",
    direction: "LONG",
    accountId: "",
    strategyId: "",
    entryDate: new Date().toISOString().slice(0, 16),
    exitDate: "",
    timeframe: "1m",
    session: "NY",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    riskPercent: "",
    riskAmount: "",
    pnl: "",
    pnlPercent: "",
    riskRewardActual: "",
    status: "closed",
    setupNotes: "",
    executionNotes: "",
    reviewNotes: "",
    mistake: "",
    lesson: "",
    chartUrl: "",
  });

  // Fetch accounts and strategies, pre-select defaults
  useEffect(() => {
    async function fetchData() {
      const [accountsRes, strategiesRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("is_active", true).order("name") as unknown as Promise<{ data: Account[] | null; error: any }>,
        supabase.from("strategies").select("*").eq("is_active", true).order("name") as unknown as Promise<{ data: Strategy[] | null; error: any }>,
      ]);

      if (accountsRes.data) {
        setAccounts(accountsRes.data);
        const defaultAccount = accountsRes.data.find((a) => a.is_default);
        if (defaultAccount) {
          setFormData((prev) => ({ ...prev, accountId: defaultAccount.id }));
        }
      }
      if (strategiesRes.data) {
        setStrategies(strategiesRes.data);
        const defaultStrategy = strategiesRes.data.find((s) => s.is_default);
        if (defaultStrategy) {
          setFormData((prev) => ({ ...prev, strategyId: defaultStrategy.id }));
        }
      }
    }

    fetchData();
  }, [supabase]);

  // Update account size when account changes
  useEffect(() => {
    if (formData.accountId) {
      const account = accounts.find((a) => a.id === formData.accountId);
      if (account) {
        setAccountSize(account.current_balance);
      }
    } else {
      setAccountSize(0);
    }
  }, [formData.accountId, accounts]);

  // Auto-calculate Risk % when Risk Amount or Account changes
  const calculateRiskPercent = useCallback(() => {
    if (accountSize > 0 && formData.riskAmount) {
      const riskAmt = parseFloat(formData.riskAmount);
      if (!isNaN(riskAmt)) {
        const riskPct = (riskAmt / accountSize) * 100;
        return riskPct.toFixed(2);
      }
    }
    return "";
  }, [accountSize, formData.riskAmount]);

  // Auto-calculate PnL % when PnL or Account changes
  const calculatePnlPercent = useCallback(() => {
    if (accountSize > 0 && formData.pnl) {
      const pnlValue = parseFloat(formData.pnl);
      if (!isNaN(pnlValue)) {
        const pnlPct = (pnlValue / accountSize) * 100;
        return pnlPct.toFixed(2);
      }
    }
    return "";
  }, [accountSize, formData.pnl]);

  // Auto-calculate RRx when Risk Amount and PnL are available
  const calculateRRx = useCallback(() => {
    if (formData.riskAmount && formData.pnl) {
      const riskAmt = parseFloat(formData.riskAmount);
      const pnlValue = parseFloat(formData.pnl);
      if (!isNaN(riskAmt) && !isNaN(pnlValue) && riskAmt > 0) {
        const rrx = pnlValue / riskAmt;
        return rrx.toFixed(2);
      }
    }
    return "";
  }, [formData.riskAmount, formData.pnl]);

  // Update calculated values
  useEffect(() => {
    const newRiskPercent = calculateRiskPercent();
    const newPnlPercent = calculatePnlPercent();
    const newRRx = calculateRRx();

    setFormData((prev) => ({
      ...prev,
      riskPercent: newRiskPercent,
      pnlPercent: newPnlPercent,
      riskRewardActual: newRRx,
    }));
  }, [calculateRiskPercent, calculatePnlPercent, calculateRRx]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Determine is_winner based on PnL
      const pnlValue = formData.pnl ? parseFloat(formData.pnl) : null;
      const isWinner = pnlValue !== null ? pnlValue > 0 : null;

      const tradeData: TradeInsert = {
        user_id: user.id,
        account_id: formData.accountId || null,
        strategy_id: formData.strategyId || null,
        title: formData.title,
        security: formData.security.toUpperCase(),
        market: formData.market as "crypto" | "forex" | "stocks" | "futures" | "options",
        direction: formData.direction as "LONG" | "SHORT",
        entry_date: formData.entryDate,
        exit_date: formData.exitDate || null,
        timeframe: formData.timeframe,
        session: formData.session as "AS" | "LO" | "NY" | "OTHER",
        entry_price: formData.entryPrice ? parseFloat(formData.entryPrice) : null,
        exit_price: formData.exitPrice ? parseFloat(formData.exitPrice) : null,
        stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
        take_profit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
        risk_percent: formData.riskPercent ? parseFloat(formData.riskPercent) : null,
        risk_amount: formData.riskAmount ? parseFloat(formData.riskAmount) : null,
        pnl: pnlValue,
        pnl_percent: formData.pnlPercent ? parseFloat(formData.pnlPercent) : null,
        risk_reward_actual: formData.riskRewardActual
          ? parseFloat(formData.riskRewardActual)
          : null,
        is_winner: isWinner,
        status: formData.status as "open" | "closed" | "cancelled",
        setup_notes: formData.setupNotes || null,
        execution_notes: formData.executionNotes || null,
        review_notes: formData.reviewNotes || null,
        mistake: formData.mistake || null,
        lesson: formData.lesson || null,
        chart_url: formData.chartUrl || null,
      };

      const { error } = await supabase.from("trades").insert(tradeData as any);

      if (error) throw error;

      router.push("/trades");
    } catch (error) {
      console.error("Error creating trade:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build options for selects
  const accountOptions = [
    { value: "", label: "Select Account" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const strategyOptions = [
    { value: "", label: "Select Strategy" },
    ...strategies.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="New Trade" description="Log a new trade entry" />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Link href="/trades">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trades
            </Button>
          </Link>

          {/* Account & Strategy Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Account & Strategy</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountId">Trading Account *</Label>
                <Select
                  id="accountId"
                  name="accountId"
                  options={accountOptions}
                  value={formData.accountId}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Size</Label>
                <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-mono">
                  {accountSize > 0 ? `$${accountSize.toFixed(2)}` : "Select an account"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategyId">Strategy</Label>
                <Select
                  id="strategyId"
                  name="strategyId"
                  options={strategyOptions}
                  value={formData.strategyId}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Trade Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="SOL/USDT (1m)"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security">Security/Symbol *</Label>
                <Input
                  id="security"
                  name="security"
                  placeholder="SOL/USDT"
                  value={formData.security}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select
                  id="market"
                  name="market"
                  options={marketOptions}
                  value={formData.market}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  id="direction"
                  name="direction"
                  options={directionOptions}
                  value={formData.direction}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session">Session</Label>
                <Select
                  id="session"
                  name="session"
                  options={sessionOptions}
                  value={formData.session}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select
                  id="timeframe"
                  name="timeframe"
                  options={timeframeOptions}
                  value={formData.timeframe}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Timing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Entry Date/Time *</Label>
                <Input
                  id="entryDate"
                  name="entryDate"
                  type="datetime-local"
                  value={formData.entryDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitDate">Exit Date/Time</Label>
                <Input
                  id="exitDate"
                  name="exitDate"
                  type="datetime-local"
                  value={formData.exitDate}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskAmount">Risk (USD) *</Label>
                  <Input
                    id="riskAmount"
                    name="riskAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.50"
                    value={formData.riskAmount}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Risk % (Auto)</Label>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-mono flex items-center">
                    {formData.riskPercent ? `${formData.riskPercent}%` : "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    name="stopLoss"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.stopLoss}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Take Profit</Label>
                  <Input
                    id="takeProfit"
                    name="takeProfit"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.takeProfit}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    name="entryPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.entryPrice}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exitPrice">Exit Price</Label>
                  <Input
                    id="exitPrice"
                    name="exitPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.exitPrice}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pnl">P&L (USD) *</Label>
                <Input
                  id="pnl"
                  name="pnl"
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  value={formData.pnl}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>P&L % (Auto)</Label>
                <div className={`h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-mono flex items-center ${
                  formData.pnlPercent && parseFloat(formData.pnlPercent) >= 0 ? "text-green" : formData.pnlPercent ? "text-red" : ""
                }`}>
                  {formData.pnlPercent ? `${formData.pnlPercent}%` : "-"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>RRx (Auto)</Label>
                <div className={`h-9 px-3 py-2 rounded-md border-2 border-blue bg-blue/10 text-sm font-mono font-bold flex items-center ${
                  formData.riskRewardActual && parseFloat(formData.riskRewardActual) >= 0 ? "text-green" : formData.riskRewardActual ? "text-red" : ""
                }`}>
                  {formData.riskRewardActual ? `${formData.riskRewardActual}R` : "-"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Learning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setupNotes">Setup Notes</Label>
                <Textarea
                  id="setupNotes"
                  name="setupNotes"
                  placeholder="Describe your trade setup and analysis..."
                  value={formData.setupNotes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="executionNotes">Execution Notes</Label>
                <Textarea
                  id="executionNotes"
                  name="executionNotes"
                  placeholder="How did you execute the trade..."
                  value={formData.executionNotes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mistake">Mistake</Label>
                  <Textarea
                    id="mistake"
                    name="mistake"
                    placeholder="What went wrong..."
                    value={formData.mistake}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson">Lesson</Label>
                  <Textarea
                    id="lesson"
                    name="lesson"
                    placeholder="What did you learn..."
                    value={formData.lesson}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chartUrl">Chart URL</Label>
                <Input
                  id="chartUrl"
                  name="chartUrl"
                  type="url"
                  placeholder="https://tradingview.com/..."
                  value={formData.chartUrl}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/trades">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Trade
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
