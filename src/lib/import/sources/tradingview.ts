// TradingView exports one row per fill — an Entry row and an Exit row sharing
// a trade number — so they have to be paired into a single journal trade.
//
// Several headers carry the quote currency ("Price USDT", "Net PnL USDT"), so
// columns are matched on a normalized prefix rather than an exact name.

import { normalizeHeader } from "../fields";
import { parseDate, type BuildResult, type ImportTimezone, type ParsedTrade, type RowIssue } from "../transform";
import { deriveIsWinner } from "@/lib/utils";

type Market = "crypto" | "forex" | "stocks" | "futures" | "options";

export interface TradingViewOptions {
  security: string;
  market: Market;
  timeframe: string | null;
  strategyName: string | null;
  /** Applied to every trade; without it imported trades have no RRx. */
  riskAmount: number | null;
  /** How to read the export timestamps, which carry no offset. */
  timezone: ImportTimezone;
  accountBalance: number;
}

/** Header lookup by normalized prefix, skipping the percentage variants. */
function findHeader(
  headers: string[],
  prefix: string,
  opts: { excludePercent?: boolean } = {}
): string | null {
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm.startsWith(prefix)) continue;
    if (opts.excludePercent && norm.endsWith("percent")) continue;
    return h;
  }
  return null;
}

export function isTradingViewExport(headers: string[]): boolean {
  const norm = headers.map(normalizeHeader);
  return (
    norm.includes("tradenumber") &&
    norm.includes("type") &&
    norm.includes("dateandtime")
  );
}

/**
 * TradingView puts the instrument in the filename, not the data:
 * Replay_Trading_MEXC_NEARUSDT.P_2026-10-01_534a1.csv -> NEARUSDT.P
 * The segment before the date is the symbol; the one before that the exchange.
 */
export function symbolFromFilename(filename: string): string | null {
  const base = filename.replace(/\.csv$/i, "");
  const parts = base.split("_");
  const dateIndex = parts.findIndex((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));

  if (dateIndex > 0) return parts[dateIndex - 1] || null;
  return null;
}

function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[^0-9.+-eE]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * "2026-09-01 08:50:30" -> ISO. TradingView writes the chart's timezone with
 * no offset, so the caller says how to read it.
 */
function toIso(raw: string | undefined, tz: ImportTimezone): string | null {
  if (!raw) return null;
  return parseDate(raw.trim().replace(" ", "T"), tz);
}

interface Leg {
  type: string;
  signal: string | null;
  date: string | null;
  price: number | null;
  qty: number | null;
  pnl: number | null;
  returnPct: number | null;
}

/**
 * Risk is not in the export, but a trade stopped out lost exactly its risk —
 * so the median loss across stop-loss exits is a usable suggestion.
 */
export function inferRiskFromStops(rows: Record<string, string>[], headers: string[]): number | null {
  const typeH = findHeader(headers, "type");
  const signalH = findHeader(headers, "signal");
  const pnlH = findHeader(headers, "netpnl", { excludePercent: true });
  if (!typeH || !signalH || !pnlH) return null;

  const losses: number[] = [];
  for (const row of rows) {
    const type = (row[typeH] ?? "").toLowerCase();
    const signal = (row[signalH] ?? "").toLowerCase();
    if (!type.startsWith("exit") || !signal.includes("stop")) continue;

    const pnl = num(row[pnlH]);
    if (pnl != null && pnl < 0) losses.push(Math.abs(pnl));
  }

  if (losses.length === 0) return null;
  losses.sort((a, b) => a - b);
  const mid = Math.floor(losses.length / 2);
  const median =
    losses.length % 2 === 0 ? (losses[mid - 1] + losses[mid]) / 2 : losses[mid];

  return Math.round(median * 100) / 100;
}

export function buildTradingViewTrades(
  rows: Record<string, string>[],
  headers: string[],
  opts: TradingViewOptions
): BuildResult {
  const tradeNoH = findHeader(headers, "tradenumber");
  const typeH = findHeader(headers, "type");
  const dateH = findHeader(headers, "dateandtime");
  const signalH = findHeader(headers, "signal");
  const priceH = findHeader(headers, "price", { excludePercent: true });
  const qtyH = findHeader(headers, "sizeqty");
  const pnlH = findHeader(headers, "netpnl", { excludePercent: true });
  const returnH = findHeader(headers, "returnpercent");

  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const valid: ParsedTrade[] = [];

  if (!tradeNoH || !typeH || !dateH) {
    errors.push({
      row: 0,
      message:
        "This does not look like a TradingView export — expected Trade number, Type and Date and time columns.",
    });
    return { valid, errors, warnings, strategyNames: [] };
  }

  // Group the fills by trade number, preserving first-seen order.
  const groups = new Map<string, Leg[]>();
  for (const row of rows) {
    const key = (row[tradeNoH] ?? "").trim();
    if (!key) continue;

    const leg: Leg = {
      type: (row[typeH] ?? "").trim().toLowerCase(),
      signal: signalH ? (row[signalH] ?? "").trim() || null : null,
      date: toIso(row[dateH], opts.timezone),
      price: priceH ? num(row[priceH]) : null,
      qty: qtyH ? num(row[qtyH]) : null,
      pnl: pnlH ? num(row[pnlH]) : null,
      returnPct: returnH ? num(row[returnH]) : null,
    };

    const existing = groups.get(key);
    if (existing) existing.push(leg);
    else groups.set(key, [leg]);
  }

  const sortedKeys = [...groups.keys()].sort(
    (a, b) => Number(a) - Number(b) || a.localeCompare(b)
  );

  for (const key of sortedKeys) {
    const legs = groups.get(key)!;
    const rowNum = Number(key) || 0;

    const entry = legs.find((l) => l.type.startsWith("entry"));
    const exit = legs.find((l) => l.type.startsWith("exit"));

    if (!entry) {
      errors.push({ row: rowNum, message: `Trade ${key} has an exit with no entry` });
      continue;
    }
    if (!entry.date) {
      errors.push({ row: rowNum, message: `Trade ${key} has no usable entry date` });
      continue;
    }

    const direction: "LONG" | "SHORT" = entry.type.includes("short") ? "SHORT" : "LONG";

    // An entry with no exit is a position still open at the end of the replay.
    const isOpen = !exit;
    if (isOpen) {
      warnings.push({ row: rowNum, message: `Trade ${key} has no exit — imported as open` });
    }

    const pnl = isOpen ? null : exit!.pnl;
    const riskAmount = opts.riskAmount;
    const rrx =
      pnl != null && riskAmount != null && riskAmount > 0
        ? Math.round((pnl / riskAmount) * 100) / 100
        : null;

    const notes = [
      entry.signal ? `Entry: ${entry.signal}` : null,
      exit?.signal ? `Exit: ${exit.signal}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    valid.push({
      title: `${opts.security}${opts.timeframe ? ` (${opts.timeframe})` : ""}`,
      security: opts.security.toUpperCase(),
      market: opts.market,
      direction,
      entry_date: entry.date,
      exit_date: exit?.date ?? null,
      timeframe: opts.timeframe,
      session: null,
      entry_price: entry.price,
      exit_price: exit?.price ?? null,
      quantity: entry.qty,
      stop_loss: null,
      take_profit: null,
      risk_amount: riskAmount,
      risk_percent:
        riskAmount != null && opts.accountBalance > 0
          ? Math.round((riskAmount / opts.accountBalance) * 100 * 100) / 100
          : null,
      pnl,
      pnl_percent: isOpen ? null : exit!.returnPct,
      risk_reward_actual: rrx,
      is_winner: deriveIsWinner(pnl, riskAmount),
      status: isOpen ? "open" : "closed",
      setup_notes: notes || null,
      execution_notes: null,
      review_notes: null,
      mistake: null,
      lesson: null,
      chart_url: null,
      strategyName: opts.strategyName,
    });
  }

  return {
    valid,
    errors,
    warnings,
    strategyNames: opts.strategyName ? [opts.strategyName] : [],
  };
}
