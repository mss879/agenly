import type { ChatProvider, EmbeddingProvider } from "./types";
import { GeminiChatProvider } from "./gemini-chat-provider";
import { GeminiEmbeddingProvider } from "./gemini-embedding-provider";

let chatProviderInstance: ChatProvider | null = null;
let embeddingProviderInstance: EmbeddingProvider | null = null;

export function getChatProvider(provider: string = "gemini"): ChatProvider {
  if (chatProviderInstance) return chatProviderInstance;

  switch (provider) {
    case "gemini":
      chatProviderInstance = new GeminiChatProvider();
      break;
    default:
      throw new Error(`Unknown chat provider: ${provider}`);
  }

  return chatProviderInstance;
}

export function getEmbeddingProvider(provider: string = "gemini"): EmbeddingProvider {
  if (embeddingProviderInstance) return embeddingProviderInstance;

  switch (provider) {
    case "gemini":
      embeddingProviderInstance = new GeminiEmbeddingProvider();
      break;
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }

  return embeddingProviderInstance;
}
