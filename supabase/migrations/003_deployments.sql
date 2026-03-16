-- ============================================================
-- Migration 003: Deployments & Domains
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  deployment_key TEXT NOT NULL UNIQUE,
  widget_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deployment_id, domain)
);

-- Indexes
CREATE INDEX idx_deployments_workspace ON agent_deployments(workspace_id);
CREATE INDEX idx_deployments_agent ON agent_deployments(agent_id);
CREATE INDEX idx_deployments_key ON agent_deployments(deployment_key);
CREATE INDEX idx_domains_deployment ON agent_domains(deployment_id);

-- RLS
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace deployments"
  ON agent_deployments FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create deployments"
  ON agent_deployments FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update deployments"
  ON agent_deployments FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can view their workspace domains"
  ON agent_domains FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage domains"
  ON agent_domains FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER deployments_updated_at
  BEFORE UPDATE ON agent_deployments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
