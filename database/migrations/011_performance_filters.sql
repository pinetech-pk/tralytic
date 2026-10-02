-- ============================================================
-- Migration: 011_performance_filters
-- Description: Strategy and weekend filters for the Performance tab.
--
-- The analytics filters were applied client-side, which the Performance
-- tab could not honour because it reads from this function instead of
-- the trades table. Two new filters are pushed down here:
--
--   p_strategy_id   / p_no_strategy     one strategy, or the unassigned
--   p_exclude_weekends                  drop Saturday/Sunday entries
--
-- Strategy needs two parameters because a NULL p_strategy_id already
-- means "no filter", so it cannot also mean "trades with no strategy".
--
-- Weekends are judged in UTC (DOW 0 = Sunday, 6 = Saturday) to match
-- isWeekendUtc on the client and getSessionFromTime's session buckets.
-- ============================================================

DROP FUNCTION IF EXISTS get_periodic_performance(uuid, text, integer, uuid[], boolean);

CREATE OR REPLACE FUNCTION get_periodic_performance(
  p_user_id UUID,
  p_period_type TEXT DEFAULT 'weekly',
  p_num_periods INT DEFAULT 12,
  p_account_ids UUID[] DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE,
  p_strategy_id UUID DEFAULT NULL,
  p_no_strategy BOOLEAN DEFAULT FALSE,
  p_exclude_weekends BOOLEAN DEFAULT FALSE
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
      AND (
        CASE
          WHEN p_no_strategy THEN t.strategy_id IS NULL
          WHEN p_strategy_id IS NOT NULL THEN t.strategy_id = p_strategy_id
          ELSE TRUE
        END
      )
      AND (
        NOT p_exclude_weekends
        OR EXTRACT(DOW FROM t.entry_date AT TIME ZONE 'UTC') NOT IN (0, 6)
      )
  )
  SELECT
    ap.p_key AS period_key,
    ap.p_label AS period_label,
    ap.p_start AS period_start,
    ap.p_end AS period_end,
    COUNT(td.trade_id)::BIGINT AS total_trades,
    COUNT(td.trade_id) FILTER (WHERE td.is_winner = true)::BIGINT AS winning_trades,
    COUNT(td.trade_id) FILTER (WHERE td.is_winner = false)::BIGINT AS losing_trades,
    -- Win rate is over decided trades only: break-even and unrecorded
    -- trades (is_winner IS NULL) are neither wins nor losses.
    ROUND(
      CASE
        WHEN COUNT(td.trade_id) FILTER (WHERE td.is_winner IS NOT NULL) > 0 THEN
          (COUNT(td.trade_id) FILTER (WHERE td.is_winner = true)::DECIMAL
            / COUNT(td.trade_id) FILTER (WHERE td.is_winner IS NOT NULL)) * 100
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
