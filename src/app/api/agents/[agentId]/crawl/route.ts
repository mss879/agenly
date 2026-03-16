import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlWebsite } from "@/lib/services/crawl-service";
import { ingestionService } from "@/lib/services/ingestion-service";
import { embeddingService } from "@/lib/services/embedding-service";

// POST /api/agents/[agentId]/crawl — crawl a website and add to knowledge base
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const url = body.url?.trim();
    const maxPages = Math.min(body.maxPages || 50, 100); // Cap at 100

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Get agent
    const admin = createAdminClient();
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id, embedding_model")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    console.log(`[Crawl API] Starting crawl for agent ${agentId}: ${url}`);

    // Crawl the website
    const pages = await crawlWebsite(url, { maxPages });

    if (pages.length === 0) {
      return NextResponse.json({
        error: "No pages could be crawled from this URL. The site may be blocking bots or have no accessible content.",
      }, { status: 400 });
    }

    console.log(`[Crawl API] Crawled ${pages.length} pages. Starting ingestion...`);

    const results = [];

    for (const page of pages) {
      try {
        // Create a knowledge_file entry for this page
        const { data: fileRecord, error: fileError } = await admin
          .from("knowledge_files")
          .insert({
            workspace_id: agent.workspace_id,
            agent_id: agentId,
            file_name: page.title.substring(0, 255) || page.url,
            file_type: "text/html",
            file_size: Buffer.byteLength(page.textContent, "utf-8"),
            storage_path: `website://${page.url}`,
            source_type: "website",
            source_url: page.url,
            ingestion_status: "processing",
          })
          .select("id")
          .single();

        if (fileError || !fileRecord) {
          console.error(`[Crawl API] Failed to create file record for ${page.url}:`, fileError);
          results.push({ url: page.url, status: "failed", error: fileError?.message || "Unknown" });
          continue;
        }

        // Chunk the text content
        const chunks = ingestionService.splitIntoChunks(page.textContent, page.url);

        if (chunks.length === 0) {
          await admin
            .from("knowledge_files")
            .update({ ingestion_status: "completed", chunk_count: 0 })
            .eq("id", fileRecord.id);

          results.push({ url: page.url, status: "completed", chunks: 0 });
          continue;
        }

        // Generate embeddings and store
        await embeddingService.generateAndStoreEmbeddings(
          chunks,
          fileRecord.id,
          agentId,
          agent.workspace_id,
          agent.embedding_model
        );

        // Update file status
        await admin
          .from("knowledge_files")
          .update({
            ingestion_status: "completed",
            chunk_count: chunks.length,
          })
          .eq("id", fileRecord.id);

        results.push({
          url: page.url,
          title: page.title,
          status: "completed",
          chunks: chunks.length,
        });

        console.log(`[Crawl API] ✓ ${page.title}: ${chunks.length} chunks`);
      } catch (err) {
        console.error(`[Crawl API] ✗ Failed to process ${page.url}:`, err);
        results.push({
          url: page.url,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.status === "completed");
    const failed = results.filter((r) => r.status === "failed");

    console.log(`[Crawl API] Finished: ${succeeded.length} succeeded, ${failed.length} failed`);

    return NextResponse.json({
      message: `Crawled and ingested ${succeeded.length} page(s) from ${url}`,
      pagesFound: pages.length,
      pagesIngested: succeeded.length,
      pagesFailed: failed.length,
      results,
    });
  } catch (error) {
    console.error("POST /api/agents/[agentId]/crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
