-- ============================================================
-- Migration: 012_profile_trade_columns
-- Description: Remember the trades list column choice per user.
--
-- It lived in localStorage, which is per-browser — the preference did
-- not follow the user to another machine. profiles already holds the
-- other per-user display settings (theme, timezone, default_currency),
-- so this follows that pattern rather than introducing a JSON blob.
--
-- NULL means "never chosen", which the client reads as the default set.
-- An empty array would mean a table with no columns, so the two must
-- stay distinguishable.
--
-- No RLS change needed: the existing "Users can update own profile"
-- policy already covers writes to this column.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trade_columns TEXT[];
