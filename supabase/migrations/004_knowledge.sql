-- ============================================================
-- Migration 004: Knowledge Base (Files, Chunks, Embeddings)
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge files
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  ingestion_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending', 'processing', 'completed', 'failed')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES knowledge_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge embeddings
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'gemini-embedding-2-preview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_knowledge_files_agent ON knowledge_files(agent_id);
CREATE INDEX idx_knowledge_files_workspace ON knowledge_files(workspace_id);
CREATE INDEX idx_knowledge_files_status ON knowledge_files(ingestion_status);

CREATE INDEX idx_knowledge_chunks_file ON knowledge_chunks(file_id);
CREATE INDEX idx_knowledge_chunks_agent ON knowledge_chunks(agent_id);

CREATE INDEX idx_knowledge_embeddings_chunk ON knowledge_embeddings(chunk_id);
CREATE INDEX idx_knowledge_embeddings_agent ON knowledge_embeddings(agent_id);

-- HNSW index for fast vector similarity search, scoped by agent_id
-- Using cosine distance for normalized embeddings
CREATE INDEX idx_knowledge_embeddings_vector ON knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Knowledge files policies
CREATE POLICY "Members can view their workspace knowledge files"
  ON knowledge_files FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create knowledge files"
  ON knowledge_files FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update knowledge files"
  ON knowledge_files FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete knowledge files"
  ON knowledge_files FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Knowledge chunks policies
CREATE POLICY "Members can view their workspace chunks"
  ON knowledge_chunks FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create chunks"
  ON knowledge_chunks FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete chunks"
  ON knowledge_chunks FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Knowledge embeddings policies
CREATE POLICY "Members can view their workspace embeddings"
  ON knowledge_embeddings FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create embeddings"
  ON knowledge_embeddings FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete embeddings"
  ON knowledge_embeddings FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER knowledge_files_updated_at
  BEFORE UPDATE ON knowledge_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vector similarity search function (scoped by agent_id)
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
  query_embedding vector(768),
  match_agent_id UUID,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  chunk_id UUID,
  agent_id UUID,
  workspace_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.chunk_id,
    ke.agent_id,
    ke.workspace_id,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE ke.agent_id = match_agent_id
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
