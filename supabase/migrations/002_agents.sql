-- ============================================================
-- Migration 002: Agents
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer_service' CHECK (type IN ('customer_service')),
  system_prompt TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  chat_model TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-2-preview',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  branding JSONB NOT NULL DEFAULT '{
    "title": "",
    "greeting": "",
    "primary_color": "#6366f1",
    "background_color": "#0f172a",
    "text_color": "#f1f5f9",
    "avatar_url": "",
    "widget_position": "bottom-right"
  }',
  usage_limits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_status ON agents(status);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace agents"
  ON agents FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create agents in their workspace"
  ON agents FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agents in their workspace"
  ON agents FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can delete agents"
  ON agents FOR DELETE
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
