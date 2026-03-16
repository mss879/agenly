-- ============================================================
-- Migration 006: Billing Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  plan_name TEXT NOT NULL DEFAULT 'starter',
  monthly_base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_tokens BIGINT NOT NULL DEFAULT 1000000,
  token_overage_price NUMERIC(10,6) NOT NULL DEFAULT 0.0001,
  included_storage_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1GB
  storage_overage_price NUMERIC(12,10) NOT NULL DEFAULT 0.00000001,
  request_price NUMERIC(10,6) NOT NULL DEFAULT 0,
  per_agent_overrides JSONB NOT NULL DEFAULT '{}',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_billing_workspace ON workspace_billing_settings(workspace_id);

-- RLS
ALTER TABLE workspace_billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view billing settings"
  ON workspace_billing_settings FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update billing settings"
  ON workspace_billing_settings FOR UPDATE
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can create billing settings"
  ON workspace_billing_settings FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER billing_settings_updated_at
  BEFORE UPDATE ON workspace_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
