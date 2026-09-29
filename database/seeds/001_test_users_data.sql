-- ============================================================
-- Seed: three test personas with realistic trade data
--
-- PREREQUISITE: create these three users first, in
-- Supabase Dashboard -> Authentication -> Users -> Add user
-- (tick "Auto Confirm User" so they can log in immediately):
--
--   scalper@tralytic.test
--   swing@tralytic.test
--   sparse@tralytic.test
--
-- The on_auth_user_created triggers give each one a profile row,
-- a 'learning' subscription and the platform_user role, so this
-- script only has to add accounts, strategies and trades.
--
-- Re-running is safe: it deletes and recreates the accounts,
-- strategies and trades belonging to these three users ONLY.
-- ============================================================

DO $$
DECLARE
  u_scalper UUID;
  u_swing   UUID;
  u_sparse  UUID;

  acc_binance   UUID;
  acc_ftmo      UUID;
  acc_old       UUID;
  acc_ic        UUID;
  acc_backtest  UUID;
  acc_zerodha   UUID;

  st_orb      UUID;
  st_vwap     UUID;
  st_sweep    UUID;
  st_zones    UUID;
  st_pullback UUID;
BEGIN
  SELECT id INTO u_scalper FROM auth.users WHERE email = 'scalper@tralytic.test';
  SELECT id INTO u_swing   FROM auth.users WHERE email = 'swing@tralytic.test';
  SELECT id INTO u_sparse  FROM auth.users WHERE email = 'sparse@tralytic.test';

  IF u_scalper IS NULL OR u_swing IS NULL OR u_sparse IS NULL THEN
    RAISE EXCEPTION 'Create the three test users in Authentication -> Users first (see header)';
  END IF;

  -- Clean slate for these three users only.
  DELETE FROM public.trades     WHERE user_id IN (u_scalper, u_swing, u_sparse);
  DELETE FROM public.strategies WHERE user_id IN (u_scalper, u_swing, u_sparse);
  DELETE FROM public.accounts   WHERE user_id IN (u_scalper, u_swing, u_sparse);

  UPDATE public.profiles SET full_name = 'Ali (scalper)'         WHERE id = u_scalper;
  UPDATE public.profiles SET full_name = 'Sara (swing trader)'   WHERE id = u_swing;
  UPDATE public.profiles SET full_name = 'Bilal (sparse logger)' WHERE id = u_sparse;

  -- ========================================================
  -- Persona A: high-frequency crypto scalper
  -- Six months of trades split into a weaker "old era" and a
  -- stronger "current era" — the archiving scenario.
  -- ========================================================
  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_scalper, 'Binance Futures', 'Main live scalping account', 5000, 6840,
          'personal', 'high', 'Binance', TRUE, TRUE)
  RETURNING id INTO acc_binance;

  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_scalper, 'FTMO 10k Challenge', 'Funded evaluation account', 10000, 10920,
          'funded', 'medium', 'FTMO', TRUE, FALSE)
  RETURNING id INTO acc_ftmo;

  -- Holds the entire weaker "v1 system" era, so archiving this one account
  -- cleanly removes that era from current analytics.
  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_scalper, 'Binance Futures (v1 system)', 'Pre-upgrade scalping, kept for reference',
          5000, 4460, 'personal', 'high', 'Binance', TRUE, FALSE)
  RETURNING id INTO acc_old;

  INSERT INTO public.strategies (user_id, name, description, tags, entry_criteria, is_active, is_default)
  VALUES (u_scalper, 'ORB Breakout', 'Opening range breakout on the 1m',
          ARRAY['breakout','momentum'], 'Break and retest of the first 15m range', TRUE, TRUE)
  RETURNING id INTO st_orb;

  INSERT INTO public.strategies (user_id, name, description, tags, entry_criteria, is_active, is_default)
  VALUES (u_scalper, 'VWAP Reclaim', 'Mean reversion back through VWAP',
          ARRAY['mean-reversion'], 'Reclaim of session VWAP with volume', TRUE, FALSE)
  RETURNING id INTO st_vwap;

  INSERT INTO public.strategies (user_id, name, description, tags, entry_criteria, is_active, is_default)
  VALUES (u_scalper, 'Liquidity Sweep', 'Stop run then reversal',
          ARRAY['smc','reversal'], 'Sweep of prior low followed by displacement', TRUE, FALSE)
  RETURNING id INTO st_sweep;

  WITH base AS (
    SELECT
      g.i,
      (g.i > 95) AS new_era,
      (ARRAY['SOL/USDT','BTC/USDT','ETH/USDT','SUI/USDT'])[1 + floor(random() * 4)::int] AS security,
      (ARRAY['30s','30s','1m','1m','2m','5m'])[1 + floor(random() * 6)::int] AS timeframe,
      (ARRAY['AS','LO','NY','NY'])[1 + floor(random() * 4)::int] AS session,
      (ARRAY['LONG','SHORT'])[1 + floor(random() * 2)::int] AS direction,
      round((random() * 30 + 20)::numeric, 2) AS risk_amount,
      random() AS r_win,
      random() AS r_strategy,
      random() AS r_account,
      NOW()
        - ((190 - g.i) * INTERVAL '0.95 day')
        + (random() * INTERVAL '9 hours') AS entry_date
    FROM generate_series(1, 190) AS g(i)
  ), calc AS (
    SELECT
      b.*,
      CASE
        WHEN b.r_win < (CASE WHEN b.new_era THEN 0.58 ELSE 0.41 END)
          THEN round((random() * 2.3 + 0.5)::numeric, 2)
        ELSE -1 * round((random() * 0.55 + 0.6)::numeric, 2)
      END AS rrx
    FROM base b
  )
  INSERT INTO public.trades (
    user_id, account_id, strategy_id, title, security, market, direction,
    entry_date, exit_date, timeframe, session,
    risk_percent, risk_amount, pnl, pnl_percent, risk_reward_actual,
    is_winner, status, setup_notes, tags
  )
  SELECT
    u_scalper,
    CASE
      WHEN NOT c.new_era THEN acc_old
      WHEN c.r_account < 0.72 THEN acc_binance
      ELSE acc_ftmo
    END,
    -- ~12% of trades are deliberately strategy-less
    CASE
      WHEN c.r_strategy < 0.12 THEN NULL
      WHEN c.r_strategy < 0.55 THEN st_orb
      WHEN c.r_strategy < 0.82 THEN st_vwap
      ELSE st_sweep
    END,
    c.security || ' (' || c.timeframe || ')',
    c.security,
    'crypto',
    c.direction,
    c.entry_date,
    c.entry_date + (random() * INTERVAL '45 minutes'),
    c.timeframe,
    c.session,
    round((c.risk_amount / 5000 * 100)::numeric, 2),
    c.risk_amount,
    round((c.risk_amount * c.rrx)::numeric, 2),
    round((c.risk_amount * c.rrx / 5000 * 100)::numeric, 2),
    c.rrx,
    (c.rrx > 0),
    'closed',
    CASE WHEN c.r_strategy < 0.12 THEN 'Impulse entry, no setup' ELSE NULL END,
    CASE WHEN c.new_era THEN ARRAY['v2-system'] ELSE ARRAY['v1-system'] END
  FROM calc c;

  -- Two trades still open
  INSERT INTO public.trades (user_id, account_id, strategy_id, title, security, market, direction,
                             entry_date, timeframe, session, risk_percent, risk_amount, status)
  VALUES
    (u_scalper, acc_binance, st_orb, 'SOL/USDT (1m)', 'SOL/USDT', 'crypto', 'LONG',
     NOW() - INTERVAL '3 hours', '1m', 'NY', 0.60, 30, 'open'),
    (u_scalper, acc_ftmo, st_sweep, 'BTC/USDT (30s)', 'BTC/USDT', 'crypto', 'SHORT',
     NOW() - INTERVAL '1 hour', '30s', 'NY', 0.45, 45, 'open');

  -- ========================================================
  -- Persona B: lower-frequency swing trader, multi-account
  -- ========================================================
  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_swing, 'IC Markets Live', 'Primary swing account', 25000, 28450,
          'personal', 'low', 'IC Markets', TRUE, TRUE)
  RETURNING id INTO acc_ic;

  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_swing, 'Backtest 2026', 'Replay testing, not real money', 50000, 54300,
          'backtest', 'medium', NULL, TRUE, FALSE)
  RETURNING id INTO acc_backtest;

  INSERT INTO public.strategies (user_id, name, description, tags, entry_criteria, is_active, is_default)
  VALUES (u_swing, 'Daily S/D Zones', 'Supply and demand from the daily chart',
          ARRAY['zones','swing'], 'Fresh daily zone with clean approach', TRUE, TRUE)
  RETURNING id INTO st_zones;

  INSERT INTO public.strategies (user_id, name, description, tags, entry_criteria, is_active, is_default)
  VALUES (u_swing, 'Weekly Trend Pullback', 'Pullback continuation in weekly trend',
          ARRAY['trend','pullback'], '50% retrace of impulse leg with weekly trend', TRUE, FALSE)
  RETURNING id INTO st_pullback;

  WITH base AS (
    SELECT
      g.i,
      (ARRAY['EURUSD','GBPUSD','XAUUSD','USDJPY'])[1 + floor(random() * 4)::int] AS security,
      (ARRAY['4h','4h','12h','1d'])[1 + floor(random() * 4)::int] AS timeframe,
      (ARRAY['LO','NY'])[1 + floor(random() * 2)::int] AS session,
      (ARRAY['LONG','SHORT'])[1 + floor(random() * 2)::int] AS direction,
      round((random() * 200 + 150)::numeric, 2) AS risk_amount,
      random() AS r_win,
      random() AS r_strategy,
      random() AS r_account,
      NOW()
        - ((70 - g.i) * INTERVAL '3.4 day')
        + (random() * INTERVAL '6 hours') AS entry_date
    FROM generate_series(1, 70) AS g(i)
  ), calc AS (
    SELECT
      b.*,
      CASE
        WHEN b.r_win < 0.49 THEN round((random() * 3.0 + 0.9)::numeric, 2)
        ELSE -1 * round((random() * 0.4 + 0.75)::numeric, 2)
      END AS rrx
    FROM base b
  )
  INSERT INTO public.trades (
    user_id, account_id, strategy_id, title, security, market, direction,
    entry_date, exit_date, timeframe, session,
    risk_percent, risk_amount, pnl, pnl_percent, risk_reward_actual,
    is_winner, status, setup_notes, review_notes
  )
  SELECT
    u_swing,
    CASE WHEN c.r_account < 0.65 THEN acc_ic ELSE acc_backtest END,
    CASE WHEN c.r_strategy < 0.6 THEN st_zones ELSE st_pullback END,
    c.security || ' (' || c.timeframe || ')',
    c.security,
    'forex',
    c.direction,
    c.entry_date,
    c.entry_date + (random() * INTERVAL '4 day'),
    c.timeframe,
    c.session,
    round((c.risk_amount / 25000 * 100)::numeric, 2),
    c.risk_amount,
    round((c.risk_amount * c.rrx)::numeric, 2),
    round((c.risk_amount * c.rrx / 25000 * 100)::numeric, 2),
    c.rrx,
    (c.rrx > 0),
    'closed',
    'Zone reaction with confluence',
    CASE WHEN c.rrx < 0 THEN 'Entered before confirmation' ELSE NULL END
  FROM calc c;

  -- A couple of cancelled setups that never triggered
  INSERT INTO public.trades (user_id, account_id, strategy_id, title, security, market, direction,
                             entry_date, timeframe, session, risk_amount, status, setup_notes)
  VALUES
    (u_swing, acc_ic, st_zones, 'XAUUSD (4h)', 'XAUUSD', 'forex', 'SHORT',
     NOW() - INTERVAL '9 day', '4h', 'LO', 200, 'cancelled', 'Price never reached the zone'),
    (u_swing, acc_ic, st_pullback, 'EURUSD (1d)', 'EURUSD', 'forex', 'LONG',
     NOW() - INTERVAL '4 day', '1d', 'NY', 180, 'cancelled', 'Invalidated before entry');

  -- ========================================================
  -- Persona C: incomplete logger — no strategies at all and
  -- most trades missing risk/PnL, so analytics go blind.
  -- ========================================================
  INSERT INTO public.accounts (user_id, name, description, initial_capital, current_balance,
                               account_type, risk_level, broker, is_active, is_default)
  VALUES (u_sparse, 'Zerodha', 'Equity intraday', 3000, 3120,
          'personal', 'medium', 'Zerodha', TRUE, TRUE)
  RETURNING id INTO acc_zerodha;

  WITH base AS (
    SELECT
      g.i,
      (ARRAY['RELIANCE','TCS','INFY','HDFCBANK'])[1 + floor(random() * 4)::int] AS security,
      (ARRAY['5m','15m','1h'])[1 + floor(random() * 3)::int] AS timeframe,
      (ARRAY['LONG','SHORT'])[1 + floor(random() * 2)::int] AS direction,
      random() AS r_complete,
      random() AS r_win,
      NOW() - ((45 - g.i) * INTERVAL '2.1 day') AS entry_date
    FROM generate_series(1, 45) AS g(i)
  )
  INSERT INTO public.trades (
    user_id, account_id, strategy_id, title, security, market, direction,
    entry_date, exit_date, timeframe, session,
    risk_amount, pnl, risk_reward_actual, is_winner, status
  )
  SELECT
    u_sparse,
    acc_zerodha,
    NULL,                                   -- never assigns a strategy
    b.security || ' (' || b.timeframe || ')',
    b.security,
    'stocks',
    b.direction,
    b.entry_date,
    b.entry_date + INTERVAL '4 hours',
    b.timeframe,
    'OTHER',
    -- only ~40% of trades record risk at all
    CASE WHEN b.r_complete < 0.4 THEN round((random() * 40 + 20)::numeric, 2) ELSE NULL END,
    -- and only ~55% record PnL
    CASE WHEN b.r_complete < 0.55
      THEN round(((CASE WHEN b.r_win < 0.5 THEN 1 ELSE -1 END) * (random() * 60 + 15))::numeric, 2)
      ELSE NULL END,
    NULL,                                   -- RRx never captured
    CASE WHEN b.r_complete < 0.55 THEN (b.r_win < 0.5) ELSE NULL END,
    'closed'
  FROM base b;

  RAISE NOTICE 'Seeded: scalper=% trades, swing=% trades, sparse=% trades',
    (SELECT count(*) FROM public.trades WHERE user_id = u_scalper),
    (SELECT count(*) FROM public.trades WHERE user_id = u_swing),
    (SELECT count(*) FROM public.trades WHERE user_id = u_sparse);
END $$;
