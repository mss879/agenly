import { GoogleGenAI } from "@google/genai";
import type { ChatProvider, ChatRequest, ChatResponse, FunctionCall } from "./types";
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

    // Build config
    const config: Record<string, unknown> = {
      systemInstruction: request.systemPrompt || undefined,
      maxOutputTokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    };

    // Add tools (function declarations) if provided
    if (request.tools && request.tools.length > 0) {
      config.tools = [{
        functionDeclarations: request.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }];
    }

    const response = await this.client.models.generateContent({
      model,
      contents,
      config,
    });

    const text = response.text || "";
    const usageMetadata = response.usageMetadata;

    // Capture raw parts from the model response (preserves thought_signature)
    const rawModelParts: unknown[] = [];
    const functionCalls: FunctionCall[] = [];
    const candidates = response.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      // Store ALL raw parts — this includes thought parts with thought_signature
      rawModelParts.push(...parts);

      for (const part of parts) {
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name || "",
            args: (part.functionCall.args || {}) as Record<string, unknown>,
            rawModelParts: [...parts], // Attach raw parts to each function call
          });
        }
      }
    }

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
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      rawModelParts: rawModelParts.length > 0 ? rawModelParts : undefined,
    };
  }

  /**
   * Continue a conversation after a function call result,
   * sending the function response back to Gemini.
   * IMPORTANT: Uses raw model parts to preserve thought_signature (required by Gemini 3).
   */
  async chatWithFunctionResponse(request: ChatRequest & {
    functionCall: FunctionCall;
    functionResult: Record<string, unknown>;
  }): Promise<ChatResponse> {
    const model = request.model || DEFAULT_CHAT_MODEL;

    // Build contents from messages
    const contents: Record<string, unknown>[] = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Add the model's function call — use RAW parts to preserve thought_signature
    // This is CRITICAL for Gemini 3 models
    if (request.functionCall.rawModelParts && request.functionCall.rawModelParts.length > 0) {
      // Use the raw parts exactly as received from the model (includes thought_signature)
      contents.push({
        role: "model",
        parts: request.functionCall.rawModelParts,
      });
    } else {
      // Fallback: manually build (may not work with Gemini 3)
      contents.push({
        role: "model",
        parts: [{
          functionCall: {
            name: request.functionCall.name,
            args: request.functionCall.args,
          },
        }],
      });
    }

    // Add the function response
    contents.push({
      role: "user",
      parts: [{
        functionResponse: {
          name: request.functionCall.name,
          response: request.functionResult,
        },
      }],
    });

    const config: Record<string, unknown> = {
      systemInstruction: request.systemPrompt || undefined,
      maxOutputTokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    };

    if (request.tools && request.tools.length > 0) {
      config.tools = [{
        functionDeclarations: request.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }];
    }

    const response = await this.client.models.generateContent({
      model,
      contents,
      config,
    });

    const text = response.text || "";
    const usageMetadata = response.usageMetadata;

    // Check for chained function calls — preserve raw parts here too
    const rawModelParts: unknown[] = [];
    const functionCalls: FunctionCall[] = [];
    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      rawModelParts.push(...parts);
      for (const part of parts) {
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name || "",
            args: (part.functionCall.args || {}) as Record<string, unknown>,
            rawModelParts: [...parts],
          });
        }
      }
    }

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
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      rawModelParts: rawModelParts.length > 0 ? rawModelParts : undefined,
    };
  }
}
