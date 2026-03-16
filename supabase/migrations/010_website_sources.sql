-- ============================================================
-- Migration 010: Website Sources for Knowledge Base
-- ============================================================

-- Add source tracking columns to knowledge_files
ALTER TABLE knowledge_files
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'file'
    CHECK (source_type IN ('file', 'website')),
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for querying website sources
CREATE INDEX IF NOT EXISTS idx_knowledge_files_source_type ON knowledge_files(source_type);
