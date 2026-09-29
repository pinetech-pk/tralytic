-- ============================================================
-- Migration: 007_account_archiving
-- Description: Archive whole accounts so their history stays
-- browsable but drops out of current analytics.
--
-- Three parts:
--   1. accounts.is_archived / archived_at
--   2. trades_with_archive view — trades tagged with their account's
--      archive state, so callers can filter it out
--   3. get_periodic_performance becomes archive-aware
--
-- Note on is_active vs is_archived: is_active controls whether an
-- account appears in pickers. is_archived controls whether its trades
-- count toward current performance. They are deliberately separate —
-- a closed account can stay out of the new-trade form while its
-- history still counts, and vice versa.
--
-- SECURITY: get_periodic_performance is SECURITY DEFINER and filtered
-- on the client-supplied p_user_id, so any caller could read another
-- user's performance by passing their UUID. This migration pins it to
-- auth.uid() as well. Callers already pass their own id, so no client
-- change is required.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Archive flag on accounts
-- ------------------------------------------------------------

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2. trades_with_archive: every trade, plus whether its account is
-- archived. Callers add `account_is_archived = false` to get current
-- performance and drop the filter to include history — one relation
-- and one conditional filter, rather than switching relations.
--
-- LEFT JOIN, not INNER: trades.account_id is nullable and trades
-- without an account must still be counted. COALESCE makes those
-- account-less trades non-archived.
--
-- security_invoker = on is load-bearing. Without it the view runs with
-- the owner's rights and bypasses RLS on both base tables, exposing
-- every user's trades to every caller.
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.trades_with_archive
WITH (security_invoker = on) AS
SELECT
  t.*,
  COALESCE(a.is_archived, FALSE) AS account_is_archived
FROM public.trades t
LEFT JOIN public.accounts a ON a.id = t.account_id;

GRANT SELECT ON public.trades_with_archive TO authenticated;

-- ------------------------------------------------------------
-- 3. Archive-aware get_periodic_performance
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS get_periodic_performance(uuid, text, integer, uuid[]);

CREATE OR REPLACE FUNCTION get_periodic_performance(
  p_user_id UUID,
  p_period_type TEXT DEFAULT 'weekly',
  p_num_periods INT DEFAULT 12,
  p_account_ids UUID[] DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  period_key TEXT,
  period_label TEXT,
  period_start DATE,
  period_end DATE,
  total_trades BIGINT,
  winning_trades BIGINT,
  losing_trades BIGINT,
  win_rate DECIMAL,
  total_pnl DECIMAL,
  avg_pnl DECIMAL,
  largest_win DECIMAL,
  largest_loss DECIMAL,
  long_trades BIGINT,
  short_trades BIGINT,
  total_risk_reward DECIMAL,
  gross_profit DECIMAL,
  gross_loss DECIMAL,
  profit_factor DECIMAL
) AS $$
BEGIN
  -- A SECURITY DEFINER function must not trust a client-supplied user id.
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'get_periodic_performance: may only be called for the authenticated user';
  END IF;

  RETURN QUERY
  WITH all_periods AS (
    SELECT
      gs.p_start,
      CASE
        WHEN p_period_type = 'weekly' THEN (gs.p_start + INTERVAL '6 days')::DATE
        ELSE (gs.p_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      END AS p_end,
      CASE
        WHEN p_period_type = 'weekly' THEN TO_CHAR(gs.p_start, 'IYYY-"W"IW')
        ELSE TO_CHAR(gs.p_start, 'YYYY-MM')
      END AS p_key,
      CASE
        WHEN p_period_type = 'weekly' THEN 'Week ' || EXTRACT(WEEK FROM gs.p_start)::TEXT
        ELSE TO_CHAR(gs.p_start, 'Mon YYYY')
      END AS p_label
    FROM (
      SELECT
        CASE
          WHEN p_period_type = 'weekly' THEN
            (DATE_TRUNC('week', CURRENT_DATE)::DATE - ((p_num_periods - 1 - g.i) * 7))
          ELSE
            (DATE_TRUNC('month', CURRENT_DATE)::DATE + ((g.i - (p_num_periods - 1)) || ' months')::INTERVAL)::DATE
        END AS p_start
      FROM generate_series(0, p_num_periods - 1) AS g(i)
    ) gs
  ),
  trade_data AS (
    SELECT
      CASE
        WHEN p_period_type = 'weekly' THEN DATE_TRUNC('week', COALESCE(t.exit_date, t.entry_date)::DATE)::DATE
        ELSE DATE_TRUNC('month', COALESCE(t.exit_date, t.entry_date)::DATE)::DATE
      END AS t_period_start,
      t.id AS trade_id,
      t.pnl,
      t.is_winner,
      t.direction,
      t.risk_reward_actual
    FROM public.trades t
    LEFT JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.status != 'cancelled'
      AND (p_account_ids IS NULL OR t.account_id = ANY(p_account_ids))
      AND (p_include_archived OR COALESCE(a.is_archived, FALSE) = FALSE)
  )
  SELECT
    ap.p_key AS period_key,
    ap.p_label AS period_label,
    ap.p_start AS period_start,
    ap.p_end AS period_end,
    COUNT(td.trade_id)::BIGINT AS total_trades,
    COUNT(td.trade_id) FILTER (WHERE td.is_winner = true)::BIGINT AS winning_trades,
    COUNT(td.trade_id) FILTER (WHERE td.is_winner = false)::BIGINT AS losing_trades,
    ROUND(
      CASE
        WHEN COUNT(td.trade_id) > 0 THEN
          (COUNT(td.trade_id) FILTER (WHERE td.is_winner = true)::DECIMAL / COUNT(td.trade_id)) * 100
        ELSE 0
      END, 2
    ) AS win_rate,
    ROUND(COALESCE(SUM(td.pnl), 0)::DECIMAL, 2) AS total_pnl,
    ROUND(
      CASE
        WHEN COUNT(td.trade_id) > 0 THEN COALESCE(AVG(td.pnl), 0)::DECIMAL
        ELSE 0
      END, 2
    ) AS avg_pnl,
    ROUND(COALESCE(MAX(td.pnl), 0)::DECIMAL, 2) AS largest_win,
    ROUND(COALESCE(MIN(td.pnl), 0)::DECIMAL, 2) AS largest_loss,
    COUNT(td.trade_id) FILTER (WHERE td.direction = 'LONG')::BIGINT AS long_trades,
    COUNT(td.trade_id) FILTER (WHERE td.direction = 'SHORT')::BIGINT AS short_trades,
    ROUND(COALESCE(SUM(td.risk_reward_actual), 0)::DECIMAL, 2) AS total_risk_reward,
    ROUND(COALESCE(SUM(td.pnl) FILTER (WHERE td.pnl > 0), 0)::DECIMAL, 2) AS gross_profit,
    ROUND(ABS(COALESCE(SUM(td.pnl) FILTER (WHERE td.pnl < 0), 0))::DECIMAL, 2) AS gross_loss,
    ROUND(
      CASE
        WHEN ABS(COALESCE(SUM(td.pnl) FILTER (WHERE td.pnl < 0), 0)) > 0 THEN
          COALESCE(SUM(td.pnl) FILTER (WHERE td.pnl > 0), 0)::DECIMAL /
          ABS(SUM(td.pnl) FILTER (WHERE td.pnl < 0))::DECIMAL
        WHEN COALESCE(SUM(td.pnl) FILTER (WHERE td.pnl > 0), 0) > 0 THEN
          999.99
        ELSE
          0
      END, 2
    ) AS profit_factor
  FROM all_periods ap
  LEFT JOIN trade_data td ON td.t_period_start = ap.p_start
  GROUP BY ap.p_key, ap.p_label, ap.p_start, ap.p_end
  ORDER BY ap.p_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_periodic_performance TO authenticated;
