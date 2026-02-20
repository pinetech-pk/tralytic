-- ============================================================
-- Migration: 003_periodic_performance
-- Description: Add get_periodic_performance RPC function
-- Uses ISO 8601 week standard (Monday-Sunday)
-- Supports both weekly and monthly aggregation
-- ============================================================

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
  avg_risk_reward DECIMAL
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate date range based on period type
  v_end_date := CURRENT_DATE;

  IF p_period_type = 'weekly' THEN
    -- Go back p_num_periods ISO weeks from the start of the current ISO week
    -- ISO week starts on Monday
    v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE - (p_num_periods - 1) * 7;
  ELSE
    -- Go back p_num_periods months from the start of the current month
    v_start_date := (DATE_TRUNC('month', CURRENT_DATE) - ((p_num_periods - 1) || ' months')::INTERVAL)::DATE;
  END IF;

  RETURN QUERY
  WITH periods AS (
    SELECT
      CASE
        WHEN p_period_type = 'weekly' THEN
          TO_CHAR(t.exit_date::DATE, 'IYYY-"W"IW')
        ELSE
          TO_CHAR(t.exit_date::DATE, 'YYYY-MM')
      END AS p_key,
      CASE
        WHEN p_period_type = 'weekly' THEN
          'Week ' || EXTRACT(WEEK FROM t.exit_date::DATE)::TEXT
        ELSE
          TO_CHAR(t.exit_date::DATE, 'Mon YYYY')
      END AS p_label,
      CASE
        WHEN p_period_type = 'weekly' THEN
          DATE_TRUNC('week', t.exit_date::DATE)::DATE
        ELSE
          DATE_TRUNC('month', t.exit_date::DATE)::DATE
      END AS p_start,
      CASE
        WHEN p_period_type = 'weekly' THEN
          (DATE_TRUNC('week', t.exit_date::DATE) + INTERVAL '6 days')::DATE
        ELSE
          (DATE_TRUNC('month', t.exit_date::DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      END AS p_end,
      t.pnl,
      t.is_winner,
      t.direction,
      t.risk_reward_actual
    FROM public.trades t
    WHERE t.user_id = p_user_id
      AND t.status = 'closed'
      AND t.exit_date IS NOT NULL
      AND t.exit_date::DATE >= v_start_date
      AND t.exit_date::DATE <= v_end_date
      AND (p_account_id IS NULL OR t.account_id = p_account_id)
  )
  SELECT
    p.p_key AS period_key,
    p.p_label AS period_label,
    p.p_start AS period_start,
    p.p_end AS period_end,
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE p.is_winner = true) AS winning_trades,
    COUNT(*) FILTER (WHERE p.is_winner = false) AS losing_trades,
    ROUND(
      (COUNT(*) FILTER (WHERE p.is_winner = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
    ) AS win_rate,
    ROUND(COALESCE(SUM(p.pnl), 0)::DECIMAL, 2) AS total_pnl,
    ROUND(COALESCE(AVG(p.pnl), 0)::DECIMAL, 2) AS avg_pnl,
    ROUND(COALESCE(MAX(p.pnl), 0)::DECIMAL, 2) AS largest_win,
    ROUND(COALESCE(MIN(p.pnl), 0)::DECIMAL, 2) AS largest_loss,
    COUNT(*) FILTER (WHERE p.direction = 'LONG') AS long_trades,
    COUNT(*) FILTER (WHERE p.direction = 'SHORT') AS short_trades,
    ROUND(COALESCE(AVG(p.risk_reward_actual), 0)::DECIMAL, 2) AS avg_risk_reward
  FROM periods p
  GROUP BY p.p_key, p.p_label, p.p_start, p.p_end
  ORDER BY p.p_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_periodic_performance TO authenticated;
