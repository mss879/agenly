-- ============================================================
-- Migration 012: Instagram Channels
-- Stores Instagram API config per agent for DM deployment
-- ============================================================

CREATE TABLE IF NOT EXISTS instagram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,         -- Instagram-scoped user ID
  username TEXT,                           -- @handle
  access_token TEXT NOT NULL,              -- Long-lived token (60 days)
  token_expires_at TIMESTAMPTZ,            -- When token expires
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_instagram_channels_agent ON instagram_channels(agent_id);
CREATE INDEX idx_instagram_channels_workspace ON instagram_channels(workspace_id);
CREATE UNIQUE INDEX idx_instagram_channels_ig_user ON instagram_channels(instagram_user_id);

-- RLS
ALTER TABLE instagram_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace Instagram channels"
  ON instagram_channels FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create Instagram channels"
  ON instagram_channels FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update Instagram channels"
  ON instagram_channels FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete Instagram channels"
  ON instagram_channels FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER instagram_channels_updated_at
  BEFORE UPDATE ON instagram_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
