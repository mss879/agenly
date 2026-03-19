-- ============================================================
-- Migration 014: Agent Flows & Guardrails
-- Adds optional AI behavior configuration to agents
-- ============================================================

-- Flows: array of conditional conversation flows (triggers + steps)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS flows JSONB NOT NULL DEFAULT '[]';

-- Guardrails: safety controls and restrictions config
ALTER TABLE agents ADD COLUMN IF NOT EXISTS guardrails JSONB NOT NULL DEFAULT '{}';
