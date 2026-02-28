-- ============================================================
-- Migration: 005_add_is_default
-- Description: Add is_default boolean to accounts and strategies
-- to support pre-selecting default account/strategy in trade form
-- ============================================================

-- Add is_default column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add is_default column to strategies
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
