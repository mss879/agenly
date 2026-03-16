// ─── AI Provider Types ───

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatTokenUsage {
  promptTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface ChatResponse {
  content: string;
  tokenUsage: ChatTokenUsage;
  model: string;
  finishReason?: string;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

// ─── Provider Interfaces ───

export interface ChatProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  readonly providerName: string;
}

export interface EmbeddingProvider {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  readonly providerName: string;
}
