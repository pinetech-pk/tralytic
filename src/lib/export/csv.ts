import { FIELDS } from "@/lib/import/fields";
import type { Trade } from "@/lib/types/database";

export type ExportableTrade = Trade & {
  strategies?: { name: string } | null;
};

/**
 * Headers are the canonical field keys rather than display labels, because
 * every key normalizes back to an importer alias — so a file exported here
 * re-imports without any manual column mapping.
 *
 * `status` is appended outside that set: the importer always writes
 * "closed", so it will not round-trip, but a backup should still carry it.
 */
const COLUMNS = [...FIELDS.map((f) => f.key), "status" as const];

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const raw = String(value);
  // RFC 4180: quote when the value contains a delimiter, quote or newline,
  // and escape embedded quotes by doubling them.
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function valueFor(trade: ExportableTrade, key: string): unknown {
  switch (key) {
    case "strategy":
      return trade.strategies?.name ?? null;
    case "is_winner":
      // Break-even and unrecorded trades export blank so a re-import
      // re-derives the result rather than inventing a win or a loss.
      return trade.is_winner === null ? null : trade.is_winner ? "WIN" : "LOSS";
    default:
      return (trade as unknown as Record<string, unknown>)[key];
  }
}

export function tradesToCsv(trades: ExportableTrade[]): string {
  const lines = [COLUMNS.join(",")];

  for (const trade of trades) {
    lines.push(COLUMNS.map((key) => cell(valueFor(trade, key))).join(","));
  }

  return lines.join("\r\n");
}

/** Safe for a filename on every platform, and still readable. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "account"
  );
}

export function downloadCsv(filename: string, csv: string): void {
  // The BOM keeps Excel from mangling non-ASCII in notes fields.
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
