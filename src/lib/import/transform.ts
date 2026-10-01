import { parse as parseDateFns, isValid } from "date-fns";
import type { TradeInsert } from "@/lib/types/database";
import type { FieldKey } from "./fields";
import { deriveIsWinner } from "@/lib/utils";

type Market = "crypto" | "forex" | "stocks" | "futures" | "options";
type Session = "AS" | "LO" | "NY" | "OTHER";

/** A trade ready to insert, minus the fields filled in at import time. */
export type ParsedTrade = Omit<TradeInsert, "user_id" | "account_id" | "strategy_id"> & {
  /** Resolved to strategy_id at insert time. */
  strategyName: string | null;
};

export interface RowIssue {
  row: number;
  message: string;
}

export interface BuildResult {
  valid: ParsedTrade[];
  errors: RowIssue[];
  warnings: RowIssue[];
  strategyNames: string[];
}

export interface BuildOptions {
  accountBalance: number;
  defaultMarket: Market;
  /** How to read timestamps that carry no timezone. */
  timezone: ImportTimezone;
}

const DATE_FORMATS = [
  "yyyy-MM-dd'T'HH:mm",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd",
  "MM/dd/yyyy HH:mm",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "MMMM d, yyyy h:mm a",
  "MMMM d, yyyy",
  "MMM d, yyyy",
];

/** Parse a numeric string, stripping $, %, commas, spaces. Handles (123) negatives. */
export function parseNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,%\s]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

/** How to read a timestamp that carries no timezone of its own. */
export type ImportTimezone = "local" | "utc";

/** "…Z" or "…+05:00" — the string already says which zone it is in. */
function hasExplicitZone(s: string): boolean {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
}

/**
 * Date constructors and date-fns both read a naive string as local time.
 * Shifting by the runtime's offset reinterprets that same wall-clock
 * reading as UTC instead.
 */
function asUtcInstant(d: Date): Date {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

/** Parse a date string into a full ISO string, or null if unparseable. */
export function parseDate(
  raw: string | undefined | null,
  tz: ImportTimezone = "local"
): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;

  // A string that names its own offset is unambiguous; never reinterpret it.
  const reinterpret = tz === "utc" && !hasExplicitZone(s);

  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) {
    return (reinterpret ? asUtcInstant(native) : native).toISOString();
  }

  for (const fmt of DATE_FORMATS) {
    const d = parseDateFns(s, fmt, new Date());
    if (isValid(d)) {
      return (reinterpret ? asUtcInstant(d) : d).toISOString();
    }
  }
  return null;
}

export function parseDirection(raw: string | undefined | null): "LONG" | "SHORT" | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("short") || s.includes("sell")) return "SHORT";
  if (s.includes("long") || s.includes("buy")) return "LONG";
  return null;
}

export function parseSession(raw: string | undefined | null): Session | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("asia") || s.trim() === "as") return "AS";
  if (s.includes("london") || s.includes("uk") || s.trim() === "lo") return "LO";
  if (s.includes("new york") || s.includes("newyork") || s.includes("ny") || s.includes("us")) return "NY";
  if (s.includes("other")) return "OTHER";
  return null;
}

export function parseWinLoss(raw: string | undefined | null): boolean | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (["win", "w", "yes", "true", "1", "won", "winner"].includes(s)) return true;
  if (["loss", "lose", "lost", "l", "no", "false", "0", "loser"].includes(s)) return false;
  return null;
}

export function parseMarket(raw: string | undefined | null): Market | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("crypto")) return "crypto";
  if (s.includes("forex") || s.includes("fx")) return "forex";
  if (s.includes("stock") || s.includes("equit")) return "stocks";
  if (s.includes("future")) return "futures";
  if (s.includes("option")) return "options";
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Transform mapped CSV rows into insertable trades, collecting validation
 * errors (row skipped) and warnings (row imported with a default).
 */
export function buildTrades(
  rows: Record<string, string>[],
  mapping: Record<string, FieldKey | "">,
  opts: BuildOptions
): BuildResult {
  // Reverse the mapping: FieldKey -> source header (first wins).
  const fieldToHeader = {} as Record<FieldKey, string>;
  for (const [header, key] of Object.entries(mapping)) {
    if (key && !(key in fieldToHeader)) fieldToHeader[key] = header;
  }
  const get = (row: Record<string, string>, key: FieldKey): string | undefined => {
    const header = fieldToHeader[key];
    return header ? row[header] : undefined;
  };
  const text = (raw: string | undefined): string | null => {
    const t = raw?.trim();
    return t ? t : null;
  };

  const valid: ParsedTrade[] = [];
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const strategyNames = new Set<string>();

  rows.forEach((row, i) => {
    const rowNum = i + 1;

    const security = text(get(row, "security"));
    if (!security) {
      errors.push({ row: rowNum, message: "Missing security/symbol" });
      return;
    }

    const entryRaw = get(row, "entry_date");
    const entryDate = parseDate(entryRaw, opts.timezone);
    if (!entryDate) {
      errors.push({ row: rowNum, message: `Invalid or missing entry date${entryRaw ? ` ("${entryRaw}")` : ""}` });
      return;
    }

    let direction = parseDirection(get(row, "direction"));
    if (!direction) {
      direction = "LONG";
      warnings.push({ row: rowNum, message: "Unrecognized direction — defaulted to LONG" });
    }

    const timeframe = text(get(row, "timeframe"));
    const title = text(get(row, "title")) ?? `${security}${timeframe ? ` (${timeframe})` : ""}`;

    const pnl = parseNumber(get(row, "pnl"));
    const riskAmount = parseNumber(get(row, "risk_amount"));

    // Trust imported RRx / Win when present; otherwise derive.
    const rrxMapped = parseNumber(get(row, "risk_reward_actual"));
    const rrx =
      rrxMapped ??
      (pnl != null && riskAmount != null && riskAmount !== 0 ? round2(pnl / riskAmount) : null);

    const winMapped = parseWinLoss(get(row, "is_winner"));
    const isWinner = winMapped !== null ? winMapped : deriveIsWinner(pnl ?? null, riskAmount ?? null);

    const pnlPercent =
      parseNumber(get(row, "pnl_percent")) ??
      (pnl != null && opts.accountBalance > 0 ? round2((pnl / opts.accountBalance) * 100) : null);
    const riskPercent =
      parseNumber(get(row, "risk_percent")) ??
      (riskAmount != null && opts.accountBalance > 0
        ? round2((riskAmount / opts.accountBalance) * 100)
        : null);

    const market = parseMarket(get(row, "market")) ?? opts.defaultMarket;
    const session = parseSession(get(row, "session"));
    const strategyName = text(get(row, "strategy"));
    if (strategyName) strategyNames.add(strategyName);

    valid.push({
      title,
      security: security.toUpperCase(),
      market,
      direction,
      entry_date: entryDate,
      exit_date: parseDate(get(row, "exit_date"), opts.timezone),
      timeframe,
      session,
      entry_price: parseNumber(get(row, "entry_price")),
      exit_price: parseNumber(get(row, "exit_price")),
      stop_loss: parseNumber(get(row, "stop_loss")),
      take_profit: parseNumber(get(row, "take_profit")),
      risk_amount: riskAmount,
      risk_percent: riskPercent,
      pnl,
      pnl_percent: pnlPercent,
      risk_reward_actual: rrx,
      is_winner: isWinner,
      status: "closed",
      setup_notes: text(get(row, "setup_notes")),
      execution_notes: text(get(row, "execution_notes")),
      review_notes: text(get(row, "review_notes")),
      mistake: text(get(row, "mistake")),
      lesson: text(get(row, "lesson")),
      chart_url: text(get(row, "chart_url")),
      strategyName,
    });
  });

  return { valid, errors, warnings, strategyNames: [...strategyNames] };
}
