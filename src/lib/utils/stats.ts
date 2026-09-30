/**
 * A trade within this many R of flat counts as break-even rather than a
 * small win or loss — closing down 0.1R on fees and spread is not a
 * losing trade in any meaningful sense.
 *
 * The database trigger calculate_is_winner mirrors this value and is the
 * authority on what gets stored; keep the two in step.
 */
export const BREAKEVEN_R_THRESHOLD = 0.2;

/**
 * Win, loss, or neither. Break-even is |P&L| < BREAKEVEN_R_THRESHOLD of
 * risk, falling back to exactly zero when risk was not recorded and the
 * ratio therefore cannot be computed.
 */
export function deriveIsWinner(
  pnl: number | null,
  riskAmount: number | null
): boolean | null {
  if (pnl === null) return null;
  if (pnl === 0) return null;

  if (riskAmount !== null && riskAmount > 0) {
    if (Math.abs(pnl / riskAmount) < BREAKEVEN_R_THRESHOLD) return null;
  }

  return pnl > 0;
}

export type TradeResult = "win" | "loss" | "breakeven" | "unknown";

/**
 * is_winner alone cannot tell a break-even trade from one whose P&L was
 * never recorded — both are null. The pnl column separates them.
 */
export function tradeResult(
  pnl: number | null,
  isWinner: boolean | null
): TradeResult {
  if (pnl === null) return "unknown";
  if (isWinner === null) return "breakeven";
  return isWinner ? "win" : "loss";
}

/**
 * Win rate over decided trades only. Break-even and unrecorded trades are
 * excluded from the denominator rather than counted against the rate.
 */
export function winRate(wins: number, losses: number): number {
  const decided = wins + losses;
  return decided > 0 ? (wins / decided) * 100 : 0;
}
