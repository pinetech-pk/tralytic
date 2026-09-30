-- ============================================================
-- Migration: 009_breakeven_trigger
-- Description: The database, not the app, decides is_winner.
--
-- calculate_trade_winner is a BEFORE INSERT OR UPDATE trigger on
-- trades that sets is_winner = (pnl > 0), overwriting whatever the
-- client sends. So a break-even trade was still stored as a loss even
-- after the app stopped deriving it that way, and migration 008's
-- backfill was silently undone by the same trigger on UPDATE.
--
-- This supersedes 008: re-running that backfill is pointless until the
-- trigger below is replaced, and unnecessary afterwards because this
-- migration redoes it.
--
-- The `pnl IS NOT NULL` guard is kept deliberately: CSV import can map
-- an explicit win/loss column for trades that carry no P&L, and that
-- supplied value must survive.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_is_winner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pnl IS NOT NULL THEN
    -- Exactly break-even is neither a win nor a loss.
    NEW.is_winner := CASE WHEN NEW.pnl = 0 THEN NULL ELSE NEW.pnl > 0 END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now that the trigger yields NULL at zero, touching these rows corrects
-- them. Only rows with pnl exactly 0 are affected.
UPDATE public.trades
SET is_winner = NULL
WHERE pnl = 0
  AND is_winner IS NOT NULL;
