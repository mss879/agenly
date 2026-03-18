// ─── AI Provider Types ───

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  // Raw parts from the Gemini response — includes thought_signature needed for roundtrip
  rawModelParts?: unknown[];
}

export interface FunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: FunctionDeclaration[];
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
  functionCalls?: FunctionCall[];
  // Raw candidate parts from the Gemini response (preserves thought_signature)
  rawModelParts?: unknown[];
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
