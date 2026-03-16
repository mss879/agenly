import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai/provider-factory";
import { TOP_K_RESULTS } from "@/lib/constants";
import type { RetrievedChunk } from "@/lib/types";

export class RetrievalService {
  private supabase = createAdminClient();

  /**
   * Retrieve top-K relevant knowledge chunks for a query,
   * scoped to a specific agent.
   */
  async retrieveRelevantChunks(
    query: string,
    agentId: string,
    workspaceId: string,
    topK: number = TOP_K_RESULTS
  ): Promise<RetrievedChunk[]> {
    // Generate query embedding
    const provider = getEmbeddingProvider();
    const embResponse = await provider.embed({ texts: [query] });
    const queryEmbedding = embResponse.embeddings[0];

    console.log(`[Retrieval] Query: "${query.slice(0, 50)}..." | Embedding dims: ${queryEmbedding?.length || 0}`);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.log("[Retrieval] No query embedding generated");
      return [];
    }

    // Call the vector similarity search function
    const { data, error } = await this.supabase.rpc("match_knowledge_embeddings", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_agent_id: agentId,
      match_count: topK,
      match_threshold: 0.3,
    });

    if (error) {
      console.error("[Retrieval] RPC error:", error.message);
      throw new Error(`Retrieval failed: ${error.message}`);
    }

    console.log(`[Retrieval] RPC returned ${data?.length || 0} matches`);

    // Fetch the actual chunk content
    const chunkIds = data.map((d: { chunk_id: string }) => d.chunk_id);
    const { data: chunks, error: chunkError } = await this.supabase
      .from("knowledge_chunks")
      .select("*")
      .in("id", chunkIds);

    if (chunkError) throw new Error(`Failed to fetch chunks: ${chunkError.message}`);

    // Merge similarity scores with chunk data
    return (chunks || []).map((chunk) => {
      const match = data.find((d: { chunk_id: string }) => d.chunk_id === chunk.id);
      return {
        ...chunk,
        similarity: match?.similarity || 0,
      } as RetrievedChunk;
    }).sort((a, b) => b.similarity - a.similarity);
  }
}

export const retrievalService = new RetrievalService();
