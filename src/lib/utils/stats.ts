/**
 * A trade is a win when P&L is above zero and a loss when below. Exactly
 * break-even is neither, and so is a trade whose P&L was never recorded —
 * both carry is_winner = null.
 */
export function deriveIsWinner(pnl: number | null): boolean | null {
  if (pnl === null || pnl === 0) return null;
  return pnl > 0;
}

/**
 * Win rate over decided trades only. Break-even and unrecorded trades are
 * excluded from the denominator rather than counted against the rate.
 */
export function winRate(wins: number, losses: number): number {
  const decided = wins + losses;
  return decided > 0 ? (wins / decided) * 100 : 0;
}
