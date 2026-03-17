-- ============================================================
-- Migration 011: WhatsApp Channels
-- Stores WhatsApp Cloud API config per agent for deployment
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,         -- Meta Phone Number ID
  waba_id TEXT NOT NULL,                 -- WhatsApp Business Account ID
  access_token TEXT NOT NULL,            -- Permanent or temporary access token
  verify_token TEXT NOT NULL,            -- Webhook verification token
  phone_display TEXT,                    -- Display number e.g. +1 555 174 2639
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_whatsapp_channels_agent ON whatsapp_channels(agent_id);
CREATE INDEX idx_whatsapp_channels_workspace ON whatsapp_channels(workspace_id);
CREATE UNIQUE INDEX idx_whatsapp_channels_phone ON whatsapp_channels(phone_number_id);

-- RLS
ALTER TABLE whatsapp_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace WhatsApp channels"
  ON whatsapp_channels FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create WhatsApp channels"
  ON whatsapp_channels FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update WhatsApp channels"
  ON whatsapp_channels FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete WhatsApp channels"
  ON whatsapp_channels FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER whatsapp_channels_updated_at
  BEFORE UPDATE ON whatsapp_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
