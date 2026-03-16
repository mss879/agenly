import { GoogleGenAI } from "@google/genai";
import type { EmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from "./types";
import { DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIMENSION } from "@/lib/constants";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = "gemini";
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || DEFAULT_EMBEDDING_MODEL;

    const response = await this.client.models.embedContent({
      model,
      contents: request.texts.map((text) => ({
        role: "user" as const,
        parts: [{ text }],
      })),
      config: {
        outputDimensionality: EMBEDDING_DIMENSION,
      },
    });

    // Handle the response which may have embeddings array
    const embeddings: number[][] = [];
    if (response.embeddings) {
      for (const emb of response.embeddings) {
        embeddings.push(emb.values || []);
      }
    } else if ((response as Record<string, unknown>).embedding) {
      const emb = (response as Record<string, unknown>).embedding as { values?: number[] };
      embeddings.push(emb.values || []);
    }

    return {
      embeddings,
      model,
      totalTokens: request.texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0), // estimate
    };
  }
}
