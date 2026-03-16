import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai/provider-factory";
import { usageService } from "./usage-service";
import { v4 as uuidv4 } from "uuid";
import type { ChunkResult } from "./ingestion-service";

export class EmbeddingService {
  private supabase = createAdminClient();

  /**
   * Generate embeddings for chunks and store them in the database.
   * Also records a usage event for the embedding batch.
   */
  async generateAndStoreEmbeddings(
    chunks: ChunkResult[],
    fileId: string,
    agentId: string,
    workspaceId: string,
    modelName: string = "gemini-embedding-2-preview"
  ): Promise<void> {
    if (chunks.length === 0) return;

    const provider = getEmbeddingProvider();
    const batchSize = 10; // Embed in batches of 10

    let totalEmbedded = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);

      // Generate embeddings
      const response = await provider.embed({ texts, model: modelName });

      // Store chunks and their embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = response.embeddings[j];

        // Insert chunk
        const { data: chunkData, error: chunkError } = await this.supabase
          .from("knowledge_chunks")
          .insert({
            workspace_id: workspaceId,
            agent_id: agentId,
            file_id: fileId,
            chunk_index: chunk.chunkIndex,
            content: chunk.content.replace(/\u0000/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
            token_count: chunk.tokenCount,
            metadata: chunk.metadata,
          })
          .select("id")
          .single();

        if (chunkError) throw new Error(`Failed to store chunk: ${chunkError.message}`);

        // Insert embedding
        const { error: embError } = await this.supabase
          .from("knowledge_embeddings")
          .insert({
            workspace_id: workspaceId,
            agent_id: agentId,
            chunk_id: chunkData.id,
            embedding: JSON.stringify(embedding),
            model_name: modelName,
          });

        if (embError) throw new Error(`Failed to store embedding: ${embError.message}`);

        totalEmbedded++;
      }
    }

    // Record usage event for embedding batch
    await usageService.recordUsageEvent({
      workspace_id: workspaceId,
      agent_id: agentId,
      event_type: "embedding_job",
      event_source: "embedding_job",
      idempotency_key: `emb_${fileId}_${Date.now()}`,
      model_name: modelName,
      embedding_count: totalEmbedded,
      chunk_count: chunks.length,
      billable_units: totalEmbedded,
    });

    // Update file chunk count
    await this.supabase
      .from("knowledge_files")
      .update({ chunk_count: chunks.length, ingestion_status: "completed" })
      .eq("id", fileId);
  }
}

export const embeddingService = new EmbeddingService();
