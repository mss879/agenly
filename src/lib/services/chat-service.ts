import { createAdminClient } from "@/lib/supabase/admin";
import { getChatProvider } from "@/lib/ai/provider-factory";
import { retrievalService } from "./retrieval-service";
import { usageService } from "./usage-service";
import { v4 as uuidv4 } from "uuid";
import { PROVIDER_COSTS, CHAT_MODELS } from "@/lib/constants";
import type { ChatMessage } from "@/lib/ai/types";
import type { Agent } from "@/lib/types";

export interface ChatResult {
  response: string;
  conversationId: string;
  messageId: string;
  tokenUsage: {
    promptTokenCount: number;
    outputTokenCount: number;
    totalTokenCount: number;
  };
}

export class ChatService {
  private supabase = createAdminClient();

  /**
   * Process a chat message: retrieve knowledge, build prompt, call AI, log everything.
   */
  async processChat(params: {
    message: string;
    conversationId?: string;
    agentId: string;
    workspaceId: string;
    mode: "preview" | "production";
    deploymentId?: string;
  }): Promise<ChatResult> {
    const { message, agentId, workspaceId, mode, deploymentId } = params;

    // 1. Fetch agent config
    const { data: agent, error: agentError } = await this.supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) throw new Error("Agent not found");

    // 2. Get or create conversation
    let conversationId = params.conversationId;
    if (!conversationId) {
      const { data: conv, error: convError } = await this.supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          agent_id: agentId,
          deployment_id: deploymentId || null,
          mode,
          metadata: {},
        })
        .select("id")
        .single();

      if (convError) throw new Error(`Failed to create conversation: ${convError.message}`);
      conversationId = conv.id;
    }

    // 3. Save user message
    const userMessageId = uuidv4();
    await this.supabase.from("messages").insert({
      id: userMessageId,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      agent_id: agentId,
      role: "user",
      content: message,
    });

    // 4. Retrieve relevant knowledge chunks
    let relevantChunks: Awaited<ReturnType<typeof retrievalService.retrieveRelevantChunks>> = [];
    try {
      relevantChunks = await retrievalService.retrieveRelevantChunks(
        message,
        agentId,
        workspaceId
      );
    } catch (e) {
      console.error("[Chat] Retrieval error (continuing without context):", e instanceof Error ? e.message : e);
    }

    console.log(`[Chat] Retrieved ${relevantChunks.length} knowledge chunks for prompt`);

    // 5. Build context from chunks
    const contextText = relevantChunks.length > 0
      ? `\n\nRelevant knowledge:\n${relevantChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n")}`
      : "";

    // 6. Get conversation history (last 10 messages)
    const { data: history } = await this.supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages: ChatMessage[] = (history || []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 7. Build system prompt
    const systemPrompt = `${agent.system_prompt || "You are a helpful customer service agent."}
${contextText}

Instructions:
- Answer based on the provided knowledge when available.
- If you don't know the answer, say so honestly.
- Be helpful, concise, and professional.`;

    // 8. Call AI provider
    const chatProvider = getChatProvider();
    const aiResponse = await chatProvider.chat({
      messages,
      systemPrompt,
      model: agent.chat_model,
    });

    // 9. Save assistant message
    const assistantMessageId = uuidv4();
    await this.supabase.from("messages").insert({
      id: assistantMessageId,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      agent_id: agentId,
      role: "assistant",
      content: aiResponse.content,
      token_count: aiResponse.tokenUsage.outputTokenCount,
    });

    // 10. Calculate provider cost estimate
    const costs = PROVIDER_COSTS[CHAT_MODELS.GEMINI_PRO];
    const providerCost =
      (aiResponse.tokenUsage.promptTokenCount / 1000) * costs.prompt_per_1k +
      (aiResponse.tokenUsage.outputTokenCount / 1000) * costs.output_per_1k;

    // 11. Record usage event
    const idempotencyKey = `chat_${assistantMessageId}`;
    await usageService.recordUsageEvent({
      workspace_id: workspaceId,
      agent_id: agentId,
      deployment_id: deploymentId || null,
      conversation_id: conversationId,
      message_id: assistantMessageId,
      event_type: "chat_request",
      event_source: mode === "preview" ? "preview_chat" : "production_chat",
      idempotency_key: idempotencyKey,
      model_name: agent.chat_model,
      prompt_token_count: aiResponse.tokenUsage.promptTokenCount,
      output_token_count: aiResponse.tokenUsage.outputTokenCount,
      total_token_count: aiResponse.tokenUsage.totalTokenCount,
      cached_content_token_count: aiResponse.tokenUsage.cachedContentTokenCount || 0,
      thoughts_token_count: aiResponse.tokenUsage.thoughtsTokenCount || 0,
      provider_cost_estimate: providerCost,
      billable_units: aiResponse.tokenUsage.totalTokenCount,
    });

    // 12. Update conversation timestamp
    await this.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return {
      response: aiResponse.content,
      conversationId: conversationId!,
      messageId: assistantMessageId,
      tokenUsage: {
        promptTokenCount: aiResponse.tokenUsage.promptTokenCount,
        outputTokenCount: aiResponse.tokenUsage.outputTokenCount,
        totalTokenCount: aiResponse.tokenUsage.totalTokenCount,
      },
    };
  }
}

export const chatService = new ChatService();
