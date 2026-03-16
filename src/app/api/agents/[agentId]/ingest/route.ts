import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageService } from "@/lib/services/storage-service";
import { ingestionService } from "@/lib/services/ingestion-service";
import { embeddingService } from "@/lib/services/embedding-service";

// POST /api/agents/[agentId]/ingest — trigger ingestion for files
// Body: { fileId?: string, force?: boolean }
// force=true will re-ingest even completed files (clears old chunks first)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const fileId = body.fileId;
    const force = body.force === true;

    // Get agent using admin client
    const admin = createAdminClient();

    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id, embedding_model")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get files to ingest
    let query = admin
      .from("knowledge_files")
      .select("*")
      .eq("agent_id", agentId);

    if (force) {
      // In force mode, ingest ALL files (or specific file)
      console.log(`[Ingest] Force re-ingestion for agent ${agentId}`);
    } else {
      // Normal mode: only pending files
      query = query.eq("ingestion_status", "pending");
    }

    if (fileId) {
      query = query.eq("id", fileId);
    }

    const { data: files, error } = await query;
    if (error) throw error;
    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No files to ingest" });
    }

    console.log(`[Ingest] Processing ${files.length} file(s) for agent ${agentId}`);

    const results = [];

    for (const file of files) {
      try {
        // If force mode, clear old chunks and embeddings for this file first
        if (force || file.ingestion_status !== "pending") {
          console.log(`[Ingest] Clearing old data for file ${file.id} (${file.file_name})`);
          
          // Delete embeddings for chunks of this file
          const { data: oldChunks } = await admin
            .from("knowledge_chunks")
            .select("id")
            .eq("file_id", file.id);
          
          if (oldChunks && oldChunks.length > 0) {
            const chunkIds = oldChunks.map(c => c.id);
            await admin
              .from("knowledge_embeddings")
              .delete()
              .in("chunk_id", chunkIds);
          }
          
          // Delete old chunks
          await admin
            .from("knowledge_chunks")
            .delete()
            .eq("file_id", file.id);
          
          console.log(`[Ingest] Cleared ${oldChunks?.length || 0} old chunks for file ${file.file_name}`);
        }

        // Mark as processing
        await admin
          .from("knowledge_files")
          .update({ ingestion_status: "processing", error_message: null })
          .eq("id", file.id);

        // Download file content as Buffer (important for PDFs!)
        const blob = await storageService.downloadFile(file.storage_path);
        const arrayBuf = await blob.arrayBuffer();
        const content = Buffer.from(arrayBuf);

        console.log(`[Ingest] Downloaded ${file.file_name} (${content.length} bytes, type: ${file.file_type})`);

        // Extract chunks using proper file parser
        const chunks = await ingestionService.processFile(
          content,
          file.file_type,
          file.file_name
        );

        if (chunks.length === 0) {
          await admin
            .from("knowledge_files")
            .update({
              ingestion_status: "completed",
              chunk_count: 0,
            })
            .eq("id", file.id);
          results.push({ fileId: file.id, status: "completed", chunks: 0 });
          console.log(`[Ingest] ${file.file_name}: 0 chunks extracted`);
          continue;
        }

        // Log first chunk preview to verify it's readable
        console.log(`[Ingest] ${file.file_name}: First chunk preview: "${chunks[0].content.substring(0, 100)}..."`);

        // Generate embeddings and store
        await embeddingService.generateAndStoreEmbeddings(
          chunks,
          file.id,
          agentId,
          agent.workspace_id,
          agent.embedding_model
        );

        // Update file with chunk count
        await admin
          .from("knowledge_files")
          .update({
            ingestion_status: "completed",
            chunk_count: chunks.length,
          })
          .eq("id", file.id);

        results.push({
          fileId: file.id,
          status: "completed",
          chunks: chunks.length,
        });

        console.log(`[Ingest] ✓ ${file.file_name}: ${chunks.length} chunks ingested successfully`);
      } catch (err) {
        console.error(`[Ingest] ✗ Ingestion failed for ${file.file_name}:`, err);
        await admin
          .from("knowledge_files")
          .update({
            ingestion_status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", file.id);
        results.push({ fileId: file.id, status: "failed", error: String(err) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("POST /api/agents/[agentId]/ingest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
