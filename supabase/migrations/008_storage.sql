-- ============================================================
-- Migration 008: Storage bucket & policies
-- ============================================================

-- Create private storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only authenticated users in the workspace can access
CREATE POLICY "Workspace members can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Workspace members can read their files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'knowledge-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Workspace members can delete their files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'knowledge-files'
    AND auth.role() = 'authenticated'
  );
