-- ============================================================
-- Migration: 003_periodic_performance
-- Description: Add get_periodic_performance RPC function
-- Uses ISO 8601 week standard (Monday-Sunday)
-- Supports both weekly and monthly aggregation
-- Always returns exactly p_num_periods rows (including empty periods)
-- ============================================================

DROP FUNCTION IF EXISTS get_periodic_performance(uuid, text, integer, uuid);

CREATE OR REPLACE FUNCTION get_periodic_performance(
  p_user_id UUID,
  p_period_type TEXT DEFAULT 'weekly',   -- 'weekly' or 'monthly'
  p_num_periods INT DEFAULT 12,          -- 12 or 24
  p_account_id UUID DEFAULT NULL
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
  RETURN QUERY
  WITH all_periods AS (
    -- Generate exactly p_num_periods slots ending with the current week/month
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
        WHEN p_period_type = 'weekly' THEN DATE_TRUNC('week', t.exit_date::DATE)::DATE
        ELSE DATE_TRUNC('month', t.exit_date::DATE)::DATE
      END AS t_period_start,
      t.pnl,
      t.is_winner,
      t.direction,
      t.risk_reward_actual
    FROM public.trades t
    WHERE t.user_id = p_user_id
      AND t.status = 'closed'
      AND t.exit_date IS NOT NULL
      AND (p_account_id IS NULL OR t.account_id = p_account_id)
  )
  SELECT
    ap.p_key AS period_key,
    ap.p_label AS period_label,
    ap.p_start AS period_start,
    ap.p_end AS period_end,
    COALESCE(COUNT(td.pnl), 0)::BIGINT AS total_trades,
    COALESCE(COUNT(td.pnl) FILTER (WHERE td.is_winner = true), 0)::BIGINT AS winning_trades,
    COALESCE(COUNT(td.pnl) FILTER (WHERE td.is_winner = false), 0)::BIGINT AS losing_trades,
    ROUND(
      CASE
        WHEN COUNT(td.pnl) > 0 THEN
          (COUNT(td.pnl) FILTER (WHERE td.is_winner = true)::DECIMAL / COUNT(td.pnl)) * 100
        ELSE 0
      END, 2
    ) AS win_rate,
    ROUND(COALESCE(SUM(td.pnl), 0)::DECIMAL, 2) AS total_pnl,
    ROUND(
      CASE
        WHEN COUNT(td.pnl) > 0 THEN COALESCE(AVG(td.pnl), 0)::DECIMAL
        ELSE 0
      END, 2
    ) AS avg_pnl,
    ROUND(COALESCE(MAX(td.pnl), 0)::DECIMAL, 2) AS largest_win,
    ROUND(COALESCE(MIN(td.pnl), 0)::DECIMAL, 2) AS largest_loss,
    COALESCE(COUNT(td.pnl) FILTER (WHERE td.direction = 'LONG'), 0)::BIGINT AS long_trades,
    COALESCE(COUNT(td.pnl) FILTER (WHERE td.direction = 'SHORT'), 0)::BIGINT AS short_trades,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_periodic_performance TO authenticated;
