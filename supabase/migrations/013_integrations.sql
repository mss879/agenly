-- ============================================================
-- 013: Agent Integrations
-- Stores third-party API credentials (encrypted) per agent
-- ============================================================

CREATE TABLE agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                   -- 'calendly'|'zoom'|'google_calendar'|'hubspot'|'salesforce'|'shopify'|'stripe'|'google_sheets'|'slack'|'sendgrid'
  credentials JSONB NOT NULL DEFAULT '{}',  -- AES-256-GCM encrypted blob
  config JSONB NOT NULL DEFAULT '{}',       -- provider-specific settings (event type URI, store URL, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, provider)                -- one integration per provider per agent
);

-- Index for fast lookups by agent
CREATE INDEX idx_agent_integrations_agent ON agent_integrations(agent_id);
CREATE INDEX idx_agent_integrations_workspace ON agent_integrations(workspace_id);

-- RLS
ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: workspace owners can manage their integrations
CREATE POLICY "Users can manage own integrations"
  ON agent_integrations
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
