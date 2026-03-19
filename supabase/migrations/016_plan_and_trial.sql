-- ============================================================
-- Migration 016: Plan & Trial columns on workspace_billing_settings
-- ============================================================

ALTER TABLE workspace_billing_settings
  ADD COLUMN IF NOT EXISTS selected_plan TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing','active','past_due','cancelled','expired')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Index for quick plan lookups
CREATE INDEX IF NOT EXISTS idx_billing_plan ON workspace_billing_settings(selected_plan);
CREATE INDEX IF NOT EXISTS idx_billing_status ON workspace_billing_settings(subscription_status);
CREATE INDEX IF NOT EXISTS idx_billing_trial ON workspace_billing_settings(trial_ends_at);
