import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DirectionBadge } from "@/components/shared/direction-badge";
import { SessionBadge } from "@/components/shared/session-badge";
import { ResultBadge } from "@/components/shared/result-badge";
import { formatDate, formatCurrency, tradeResult } from "@/lib/utils";
import type { Trade } from "@/lib/types/database";

export interface TradeRow extends Trade {
  accounts?: { name: string } | null;
  strategies?: { name: string } | null;
}

export interface TradeColumn {
  id: string;
  label: string;
  /** Header and cell alignment; cells also pick up the mono/colour classes. */
  headClass?: string;
  cellClass?: string | ((t: TradeRow) => string);
  render: (t: TradeRow) => React.ReactNode;
}

const dash = <span className="text-muted-foreground">-</span>;

export const TRADE_COLUMNS: TradeColumn[] = [
  {
    id: "date",
    label: "Date",
    cellClass: "font-mono text-muted-foreground",
    render: (t) => formatDate(t.entry_date, "MMM d"),
  },
  {
    id: "trade",
    label: "Trade",
    render: (t) => (
      <Link href={`/trades/${t.id}`} className="block hover:underline">
        <div className="font-medium">{t.title}</div>
        <div className="text-xs text-muted-foreground">{t.security}</div>
      </Link>
    ),
  },
  {
    id: "direction",
    label: "Direction",
    render: (t) => <DirectionBadge direction={t.direction} />,
  },
  {
    id: "strategy",
    label: "Strategy",
    render: (t) =>
      t.strategies?.name ? (
        <Badge variant="secondary">{t.strategies.name}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">No Strategy</span>
      ),
  },
  {
    id: "session",
    label: "Session",
    render: (t) => (t.session ? <SessionBadge session={t.session} /> : dash),
  },
  {
    id: "account",
    label: "Account",
    render: (t) =>
      t.accounts?.name ? (
        <Badge variant="secondary">{t.accounts.name}</Badge>
      ) : (
        dash
      ),
  },
  {
    id: "timeframe",
    label: "Timeframe",
    cellClass: "font-mono text-muted-foreground",
    render: (t) => t.timeframe || dash,
  },
  {
    id: "market",
    label: "Market",
    cellClass: "capitalize text-muted-foreground",
    render: (t) => t.market || dash,
  },
  {
    id: "entry_price",
    label: "Entry",
    headClass: "text-right",
    cellClass: "text-right font-mono",
    render: (t) => (t.entry_price != null ? t.entry_price : dash),
  },
  {
    id: "exit_price",
    label: "Exit",
    headClass: "text-right",
    cellClass: "text-right font-mono",
    render: (t) => (t.exit_price != null ? t.exit_price : dash),
  },
  {
    id: "risk_amount",
    label: "Risk $",
    headClass: "text-right",
    cellClass: "text-right font-mono",
    render: (t) =>
      t.risk_amount != null ? `$${t.risk_amount.toFixed(2)}` : dash,
  },
  {
    id: "risk_percent",
    label: "Risk %",
    headClass: "text-right",
    cellClass: "text-right font-mono",
    render: (t) =>
      t.risk_percent != null ? `${t.risk_percent.toFixed(2)}%` : dash,
  },
  {
    id: "rrx",
    label: "RRx",
    headClass: "text-right",
    cellClass: (t) =>
      `text-right font-mono font-bold ${
        t.risk_reward_actual != null
          ? t.risk_reward_actual >= 0
            ? "text-green"
            : "text-red"
          : ""
      }`,
    render: (t) =>
      t.risk_reward_actual != null
        ? `${t.risk_reward_actual.toFixed(2)}R`
        : dash,
  },
  {
    id: "pnl",
    label: "P&L",
    headClass: "text-right",
    cellClass: (t) =>
      `text-right font-mono font-medium ${
        t.pnl != null ? (t.pnl >= 0 ? "text-green" : "text-red") : ""
      }`,
    render: (t) =>
      t.pnl != null ? (
        <>
          {t.pnl >= 0 ? "+" : ""}
          {formatCurrency(t.pnl)}
        </>
      ) : (
        dash
      ),
  },
  {
    id: "result",
    label: "Result",
    render: (t) => <ResultBadge result={tradeResult(t.pnl, t.is_winner)} />,
  },
  {
    id: "status",
    label: "Status",
    cellClass: "capitalize text-muted-foreground text-xs",
    render: (t) => t.status,
  },
  {
    id: "chart",
    label: "Chart",
    headClass: "text-center",
    cellClass: "text-center",
    render: (t) =>
      t.chart_url ? (
        <a
          href={t.chart_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center text-blue hover:text-blue/80 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        dash
      ),
  },
];

/** Shown unless the user says otherwise. Strategy replaces Session here. */
export const DEFAULT_COLUMNS = [
  "date",
  "trade",
  "direction",
  "strategy",
  "account",
  "risk_percent",
  "rrx",
  "pnl",
  "result",
  "chart",
];

/**
 * The profile is the source of truth; this only mirrors it so the table can
 * paint before the profile query returns.
 */
export const COLUMN_STORAGE_KEY = "tralytic.trades.columns";

/** Drop unknown ids so a renamed or removed column cannot blank the table. */
export function sanitizeColumns(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return TRADE_COLUMNS.filter((c) => value.includes(c.id)).map((c) => c.id);
}

export function writeColumnCache(columns: string[]): void {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Losing the mirror only costs a flash of defaults on the next load.
  }
}
