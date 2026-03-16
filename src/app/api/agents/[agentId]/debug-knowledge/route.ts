import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/agents/[agentId]/debug-knowledge — diagnostic endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // 1. Get all files for this agent
    const { data: files } = await admin
      .from("knowledge_files")
      .select("id, file_name, file_type, file_size, ingestion_status, chunk_count, error_message")
      .eq("agent_id", agentId);

    // 2. Get all chunks for this agent
    const { data: chunks } = await admin
      .from("knowledge_chunks")
      .select("id, file_id, chunk_index, content, token_count")
      .eq("agent_id", agentId)
      .order("chunk_index", { ascending: true });

    // 3. Get count of embeddings for this agent
    const { count: embeddingCount } = await admin
      .from("knowledge_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);

    // 4. Preview first 200 chars of each chunk
    const chunkPreviews = (chunks || []).map(c => ({
      id: c.id,
      file_id: c.file_id,
      chunk_index: c.chunk_index,
      content_preview: c.content.substring(0, 200),
      content_length: c.content.length,
      token_count: c.token_count,
    }));

    return NextResponse.json({
      agent_id: agentId,
      files: files || [],
      total_chunks: chunks?.length || 0,
      total_embeddings: embeddingCount || 0,
      chunk_previews: chunkPreviews,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
