-- ============================================================
-- Migration: 008_breakeven_backfill
--
-- SUPERSEDED BY 009. This backfill is a no-op on its own: the
-- calculate_trade_winner trigger recomputes is_winner on UPDATE and
-- immediately reverts every row this touches. 009 fixes the trigger
-- first and then repeats the backfill. Kept for history; running it
-- changes nothing either way.
--
-- Description: Existing break-even trades are recorded as losses.
--
-- is_winner was derived as `pnl > 0`, so a trade that closed exactly
-- flat was stored as is_winner = false and counted against win rate.
-- Break-even is neither a win nor a loss, which is NULL.
--
-- Only rows with pnl exactly 0 are touched. Trades with no recorded
-- P&L are already NULL and are left alone.
-- ============================================================

UPDATE public.trades
SET is_winner = NULL
WHERE pnl = 0
  AND is_winner IS NOT NULL;
