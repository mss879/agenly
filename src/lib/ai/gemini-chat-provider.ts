import { GoogleGenAI } from "@google/genai";
import type { ChatProvider, ChatRequest, ChatResponse } from "./types";
import { DEFAULT_CHAT_MODEL } from "@/lib/constants";

export class GeminiChatProvider implements ChatProvider {
  readonly providerName = "gemini";
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || DEFAULT_CHAT_MODEL;

    // Build contents from messages
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: request.systemPrompt || undefined,
        maxOutputTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      },
    });

    const text = response.text || "";
    const usageMetadata = response.usageMetadata;

    return {
      content: text,
      tokenUsage: {
        promptTokenCount: usageMetadata?.promptTokenCount ?? 0,
        outputTokenCount: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokenCount: usageMetadata?.totalTokenCount ?? 0,
        cachedContentTokenCount: usageMetadata?.cachedContentTokenCount ?? 0,
        thoughtsTokenCount: (usageMetadata as Record<string, number>)?.thoughtsTokenCount ?? 0,
      },
      model,
      finishReason: response.candidates?.[0]?.finishReason ?? "STOP",
    };
  }
}
