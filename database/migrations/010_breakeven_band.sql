-- ============================================================
-- Migration: 010_breakeven_band
-- Description: Break-even is a band, not exactly zero.
--
-- Closing 0.1R down on fees, spread and slippage is not a losing trade
-- in any meaningful sense. A trade whose result is within 0.2R of flat
-- is now classified as break-even: is_winner NULL, so it counts toward
-- P&L and RRx but not toward win rate either way.
--
-- Trades with no recorded risk_amount fall back to the exact-zero rule,
-- since without risk there is no R to measure the result against.
--
-- 0.2 is mirrored by BREAKEVEN_R_THRESHOLD in src/lib/utils/stats.ts.
-- This trigger is the authority on what is stored; the app-side copy
-- only shapes what the client displays before a refetch.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_is_winner()
RETURNS TRIGGER AS $$
BEGIN
  -- The guard is deliberate: with no P&L there is nothing to derive from,
  -- and CSV import may have supplied an explicit win/loss value.
  IF NEW.pnl IS NOT NULL THEN
    NEW.is_winner := CASE
      WHEN NEW.pnl = 0 THEN NULL
      WHEN NEW.risk_amount IS NOT NULL
           AND NEW.risk_amount > 0
           AND ABS(NEW.pnl / NEW.risk_amount) < 0.2 THEN NULL
      ELSE NEW.pnl > 0
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reclassify existing trades that now fall inside the band. The trigger
-- recomputes is_winner on UPDATE, so touching the row is enough.
UPDATE public.trades
SET is_winner = is_winner
WHERE pnl IS NOT NULL
  AND (
    pnl = 0
    OR (risk_amount IS NOT NULL AND risk_amount > 0
        AND ABS(pnl / risk_amount) < 0.2)
  )
  AND is_winner IS NOT NULL;
