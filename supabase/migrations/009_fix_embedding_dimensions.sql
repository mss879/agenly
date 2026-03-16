-- ============================================================
-- Migration 009: Restore embedding column to vector(768)
-- Run this ONLY if the previous broken migration altered the column to 3072
-- ============================================================

-- Drop the HNSW index if it exists (may have been dropped by broken migration)
DROP INDEX IF EXISTS idx_knowledge_embeddings_vector;

-- Ensure the column is vector(768)
ALTER TABLE knowledge_embeddings
  ALTER COLUMN embedding TYPE vector(768);

-- Recreate the HNSW index
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector ON knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Recreate the search function with 768 dims
DROP FUNCTION IF EXISTS match_knowledge_embeddings;

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
