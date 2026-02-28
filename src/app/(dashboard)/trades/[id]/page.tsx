"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Loader2, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DirectionBadge } from "@/components/shared/direction-badge";
import { SessionBadge } from "@/components/shared/session-badge";
import { ResultBadge } from "@/components/shared/result-badge";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/lib/types/database";

interface TradeWithRelations extends Trade {
  accounts?: { name: string } | null;
  strategies?: { name: string } | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium font-mono">{children}</div>
    </div>
  );
}

function NoteSection({ label, content }: { label: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function TradeDetailPage() {
  const params = useParams();
  const tradeId = params.id as string;
  const [trade, setTrade] = useState<TradeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchTrade() {
      const { data, error } = await supabase
        .from("trades")
        .select(`
          *,
          accounts(name),
          strategies(name)
        `)
        .eq("id", tradeId)
        .single() as { data: TradeWithRelations | null; error: any };

      if (error) {
        console.error("Error fetching trade:", error);
      } else {
        setTrade(data);
      }
      setLoading(false);
    }

    fetchTrade();
  }, [tradeId, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Trade Details" description="Loading..." />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Trade Not Found" description="" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground mb-4">This trade does not exist or has been deleted.</p>
          <Link href="/trades">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trades
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColor =
    trade.status === "closed"
      ? "secondary"
      : trade.status === "open"
        ? "success"
        : "warning";

  return (
    <div className="flex flex-col h-full">
      <Header title="Trade Details" description={trade.title} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Link href="/trades">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Trades
              </Button>
            </Link>
            <Link href={`/trades/${tradeId}/edit`}>
              <Button>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Trade
              </Button>
            </Link>
          </div>

          {/* Trade Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{trade.title}</h2>
                  <p className="text-muted-foreground font-mono">{trade.security}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DirectionBadge direction={trade.direction} />
                  {trade.session && <SessionBadge session={trade.session} />}
                  <Badge variant={statusColor} className="capitalize">
                    {trade.status}
                  </Badge>
                  {trade.is_winner != null && <ResultBadge isWinner={trade.is_winner} />}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account, Strategy & Context */}
          <Card>
            <CardHeader>
              <CardTitle>Account & Strategy</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Field label="Account">
                {trade.accounts?.name || <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Strategy">
                {trade.strategies?.name || <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Market">
                <span className="capitalize">{trade.market}</span>
              </Field>
              <Field label="Timeframe">
                {trade.timeframe || <span className="text-muted-foreground">—</span>}
              </Field>
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Timing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Entry Date/Time">
                {formatDateTime(trade.entry_date)}
              </Field>
              <Field label="Exit Date/Time">
                {trade.exit_date ? formatDateTime(trade.exit_date) : <span className="text-muted-foreground">—</span>}
              </Field>
            </CardContent>
          </Card>

          {/* Pricing & Risk */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Risk</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Field label="Entry Price">
                {trade.entry_price != null ? formatCurrency(trade.entry_price) : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Exit Price">
                {trade.exit_price != null ? formatCurrency(trade.exit_price) : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Stop Loss">
                {trade.stop_loss != null ? formatCurrency(trade.stop_loss) : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Take Profit">
                {trade.take_profit != null ? formatCurrency(trade.take_profit) : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Risk Amount">
                {trade.risk_amount != null ? formatCurrency(trade.risk_amount) : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Risk %">
                {trade.risk_percent != null ? formatPercent(trade.risk_percent) : <span className="text-muted-foreground">—</span>}
              </Field>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Field label="P&L">
                {trade.pnl != null ? (
                  <span className={trade.pnl >= 0 ? "text-green" : "text-red"}>
                    {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="P&L %">
                {trade.pnl_percent != null ? (
                  <span className={trade.pnl_percent >= 0 ? "text-green" : "text-red"}>
                    {formatPercent(trade.pnl_percent)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="RRx">
                {trade.risk_reward_actual != null ? (
                  <span className={`font-bold ${trade.risk_reward_actual >= 0 ? "text-green" : "text-red"}`}>
                    {trade.risk_reward_actual >= 0 ? "+" : ""}{trade.risk_reward_actual.toFixed(2)}R
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="Result">
                {trade.is_winner != null ? (
                  <ResultBadge isWinner={trade.is_winner} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
            </CardContent>
          </Card>

          {/* Notes */}
          {(trade.setup_notes || trade.execution_notes || trade.review_notes || trade.mistake || trade.lesson) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes & Learning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NoteSection label="Setup Notes" content={trade.setup_notes} />
                <NoteSection label="Execution Notes" content={trade.execution_notes} />
                <NoteSection label="Review Notes" content={trade.review_notes} />
                <NoteSection label="Mistake" content={trade.mistake} />
                <NoteSection label="Lesson" content={trade.lesson} />
              </CardContent>
            </Card>
          )}

          {/* Chart Link */}
          {trade.chart_url && (
            <Card>
              <CardHeader>
                <CardTitle>Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={trade.chart_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on TradingView
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
