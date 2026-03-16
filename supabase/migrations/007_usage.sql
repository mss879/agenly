-- ============================================================
-- Migration 007: Usage Events & Rollups
-- ============================================================

-- Append-only usage events ledger
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  deployment_id UUID REFERENCES agent_deployments(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('chat_request', 'embedding_job', 'file_upload', 'file_deletion')),
  event_source TEXT NOT NULL CHECK (event_source IN ('preview_chat', 'production_chat', 'embedding_job', 'file_upload')),
  idempotency_key TEXT NOT NULL UNIQUE,
  model_name TEXT,
  prompt_token_count INTEGER NOT NULL DEFAULT 0,
  output_token_count INTEGER NOT NULL DEFAULT 0,
  total_token_count INTEGER NOT NULL DEFAULT 0,
  cached_content_token_count INTEGER NOT NULL DEFAULT 0,
  thoughts_token_count INTEGER NOT NULL DEFAULT 0,
  embedding_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  storage_bytes_delta BIGINT NOT NULL DEFAULT 0,
  provider_cost_estimate NUMERIC(12,8) NOT NULL DEFAULT 0,
  billable_units NUMERIC(12,4) NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily rollups
CREATE TABLE IF NOT EXISTS usage_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  prompt_token_count BIGINT NOT NULL DEFAULT 0,
  output_token_count BIGINT NOT NULL DEFAULT 0,
  total_token_count BIGINT NOT NULL DEFAULT 0,
  cached_content_token_count BIGINT NOT NULL DEFAULT 0,
  thoughts_token_count BIGINT NOT NULL DEFAULT 0,
  embedding_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  storage_bytes_delta BIGINT NOT NULL DEFAULT 0,
  provider_cost_estimate NUMERIC(12,8) NOT NULL DEFAULT 0,
  billable_units NUMERIC(12,4) NOT NULL DEFAULT 0,
  preview_request_count INTEGER NOT NULL DEFAULT 0,
  deployed_request_count INTEGER NOT NULL DEFAULT 0,
  uploaded_file_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_id, date)
);

-- Monthly rollups
CREATE TABLE IF NOT EXISTS usage_monthly_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  month DATE NOT NULL, -- first day of month
  request_count INTEGER NOT NULL DEFAULT 0,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  prompt_token_count BIGINT NOT NULL DEFAULT 0,
  output_token_count BIGINT NOT NULL DEFAULT 0,
  total_token_count BIGINT NOT NULL DEFAULT 0,
  cached_content_token_count BIGINT NOT NULL DEFAULT 0,
  thoughts_token_count BIGINT NOT NULL DEFAULT 0,
  embedding_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  storage_bytes_delta BIGINT NOT NULL DEFAULT 0,
  provider_cost_estimate NUMERIC(12,8) NOT NULL DEFAULT 0,
  billable_units NUMERIC(12,4) NOT NULL DEFAULT 0,
  preview_request_count INTEGER NOT NULL DEFAULT 0,
  deployed_request_count INTEGER NOT NULL DEFAULT 0,
  uploaded_file_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_id, month)
);

-- Indexes for usage_events
CREATE INDEX idx_usage_events_workspace ON usage_events(workspace_id);
CREATE INDEX idx_usage_events_agent ON usage_events(agent_id);
CREATE INDEX idx_usage_events_deployment ON usage_events(deployment_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_source ON usage_events(event_source);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);
CREATE INDEX idx_usage_events_idempotency ON usage_events(idempotency_key);

-- Indexes for rollups
CREATE INDEX idx_daily_rollups_workspace ON usage_daily_rollups(workspace_id, date);
CREATE INDEX idx_daily_rollups_agent ON usage_daily_rollups(agent_id, date);
CREATE INDEX idx_monthly_rollups_workspace ON usage_monthly_rollups(workspace_id, month);
CREATE INDEX idx_monthly_rollups_agent ON usage_monthly_rollups(agent_id, month);

-- RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_monthly_rollups ENABLE ROW LEVEL SECURITY;

-- Usage events policies
CREATE POLICY "Members can view workspace usage events"
  ON usage_events FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- No direct insert from client — server only via service role
CREATE POLICY "Service role can insert usage events"
  ON usage_events FOR INSERT
  WITH CHECK (true);

-- Daily rollups policies
CREATE POLICY "Members can view workspace daily rollups"
  ON usage_daily_rollups FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage daily rollups"
  ON usage_daily_rollups FOR ALL
  USING (true);

-- Monthly rollups policies
CREATE POLICY "Members can view workspace monthly rollups"
  ON usage_monthly_rollups FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage monthly rollups"
  ON usage_monthly_rollups FOR ALL
  USING (true);

-- Triggers
CREATE TRIGGER daily_rollups_updated_at
  BEFORE UPDATE ON usage_daily_rollups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER monthly_rollups_updated_at
  BEFORE UPDATE ON usage_monthly_rollups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
