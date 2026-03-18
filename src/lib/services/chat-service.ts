import { createAdminClient } from "@/lib/supabase/admin";
import { getChatProvider } from "@/lib/ai/provider-factory";
import { GeminiChatProvider } from "@/lib/ai/gemini-chat-provider";
import { retrievalService } from "./retrieval-service";
import { usageService } from "./usage-service";
import { integrationService } from "./integration-service";
import { buildFunctionDeclarations, executeFunctionCall, buildToolContextForPrompt } from "./tools/tool-registry";
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
  toolsUsed?: string[];
}

export class ChatService {
  private supabase = createAdminClient();

  /**
   * Process a chat message: retrieve knowledge, build prompt, call AI, log everything.
   * Now with function-calling support for tool integrations.
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

    // 5.5 Fetch active integrations and build tool context
    let activeProviders: string[] = [];
    let credentialsMap: Record<string, Record<string, string>> = {};
    let configMap: Record<string, Record<string, unknown>> = {};
    let toolDeclarations: { name: string; description: string; parameters: Record<string, unknown> }[] = [];
    let toolContextPrompt = "";

    try {
      const integrations = await integrationService.getActiveIntegrationsDecrypted(agentId);
      activeProviders = integrations.providers;
      credentialsMap = integrations.credentialsMap;
      configMap = integrations.configMap;

      if (activeProviders.length > 0) {
        toolDeclarations = buildFunctionDeclarations(activeProviders);
        toolContextPrompt = buildToolContextForPrompt(activeProviders);
        console.log(`[Chat] Agent has ${activeProviders.length} active integration(s): ${activeProviders.join(", ")}`);
      }
    } catch (e) {
      console.error("[Chat] Failed to load integrations (continuing without tools):", e);
    }

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

    // 7. Build system prompt (now includes tool context)
    const systemPrompt = `${agent.system_prompt || "You are a helpful customer service agent."}
${contextText}
${toolContextPrompt}

Instructions:
- Answer based on the provided knowledge when available.
- If you don't know the answer, say so honestly.
- Be helpful, concise, and professional.
- When using tools, relay the results naturally to the user.
- For actions that affect external systems (creating contacts, sending emails, booking meetings), confirm with the user or clearly describe what you did.`;

    // 8. Call AI provider (now with tools)
    const chatProvider = getChatProvider();
    const aiResponse = await chatProvider.chat({
      messages,
      systemPrompt,
      model: agent.chat_model,
      tools: toolDeclarations.length > 0 ? toolDeclarations : undefined,
    });

    // 8.5 Function-calling loop: if the model wants to call a tool
    let finalResponse = aiResponse;
    const toolsUsed: string[] = [];
    const MAX_TOOL_CALLS = 5; // Prevent infinite loops

    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0 && chatProvider instanceof GeminiChatProvider) {
      let currentResponse = aiResponse;
      let toolCallCount = 0;

      while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && toolCallCount < MAX_TOOL_CALLS) {
        const fc = currentResponse.functionCalls[0]; // Process one at a time
        console.log(`[Chat] AI wants to call tool: ${fc.name}`, fc.args);

        // Execute the tool
        const { provider, action, result } = await executeFunctionCall(
          fc.name,
          fc.args,
          credentialsMap,
          configMap
        );
        toolsUsed.push(`${provider}.${action}`);

        console.log(`[Chat] Tool result (${provider}.${action}):`, result.success ? "SUCCESS" : "FAILED");

        // Feed result back to Gemini
        const followUpResponse = await chatProvider.chatWithFunctionResponse({
          messages,
          systemPrompt,
          model: agent.chat_model,
          tools: toolDeclarations.length > 0 ? toolDeclarations : undefined,
          functionCall: fc,
          functionResult: {
            success: result.success,
            message: result.message,
            data: result.data || {},
          },
        });

        currentResponse = followUpResponse;
        finalResponse = followUpResponse;
        toolCallCount++;
      }

      if (toolCallCount >= MAX_TOOL_CALLS) {
        console.warn("[Chat] Max tool call limit reached");
      }
    }

    // 9. Save assistant message
    const assistantMessageId = uuidv4();
    await this.supabase.from("messages").insert({
      id: assistantMessageId,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      agent_id: agentId,
      role: "assistant",
      content: finalResponse.content,
      token_count: finalResponse.tokenUsage.outputTokenCount,
    });

    // 10. Calculate provider cost estimate
    const costs = PROVIDER_COSTS[CHAT_MODELS.GEMINI_PRO];
    const providerCost =
      (finalResponse.tokenUsage.promptTokenCount / 1000) * costs.prompt_per_1k +
      (finalResponse.tokenUsage.outputTokenCount / 1000) * costs.output_per_1k;

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
      prompt_token_count: finalResponse.tokenUsage.promptTokenCount,
      output_token_count: finalResponse.tokenUsage.outputTokenCount,
      total_token_count: finalResponse.tokenUsage.totalTokenCount,
      cached_content_token_count: finalResponse.tokenUsage.cachedContentTokenCount || 0,
      thoughts_token_count: finalResponse.tokenUsage.thoughtsTokenCount || 0,
      provider_cost_estimate: providerCost,
      billable_units: finalResponse.tokenUsage.totalTokenCount,
    });

    // 12. Update conversation timestamp
    await this.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return {
      response: finalResponse.content,
      conversationId: conversationId!,
      messageId: assistantMessageId,
      tokenUsage: {
        promptTokenCount: finalResponse.tokenUsage.promptTokenCount,
        outputTokenCount: finalResponse.tokenUsage.outputTokenCount,
        totalTokenCount: finalResponse.tokenUsage.totalTokenCount,
      },
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };
  }
}

export const chatService = new ChatService();
