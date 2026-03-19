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

    // 5.6 Build flows prompt (conditional conversation logic)
    const flowsPrompt = this.buildFlowsPrompt(agent.flows || []);
    if (flowsPrompt) {
      console.log(`[Chat] Agent has ${(agent.flows || []).filter((f: Record<string, unknown>) => f.enabled).length} active flow(s)`);
    }

    // 5.7 Build guardrails prompt (safety controls)
    const guardrailsPrompt = this.buildGuardrailsPrompt(agent.guardrails || null);
    if (guardrailsPrompt) {
      console.log("[Chat] Agent has guardrails enabled");
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

    // 7. Build system prompt (now includes tool context, flows, and guardrails)
    const systemPrompt = `${agent.system_prompt || "You are a helpful customer service agent."}
${contextText}
${toolContextPrompt}
${flowsPrompt}
${guardrailsPrompt}

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

  /**
   * Build system prompt instructions from configured conversation flows.
   * Returns empty string if no flows are configured.
   */
  private buildFlowsPrompt(flows: Record<string, unknown>[]): string {
    if (!flows || flows.length === 0) return "";

    const enabledFlows = flows.filter((f) => f.enabled);
    if (enabledFlows.length === 0) return "";

    const lines: string[] = [
      "\n\n--- CONVERSATION FLOWS ---",
      "You have configured conversation flows. When a user's message matches a flow trigger, you MUST follow that flow's steps in order. Here are your flows:",
    ];

    for (const flow of enabledFlows) {
      const trigger = flow.trigger as { type: string; keywords: string[] };
      const steps = flow.steps as { type: string; content?: string; field?: string; prompt?: string; validation?: string }[];

      lines.push(`\n**Flow: ${flow.name}** (Priority: ${flow.priority || 1})`);

      if (trigger.type === "keyword" && trigger.keywords?.length > 0) {
        lines.push(`  Trigger: When the user's message contains ANY of these keywords: ${trigger.keywords.map((k) => `"${k}"`).join(", ")}`);
      } else if (trigger.type === "intent") {
        lines.push(`  Trigger: When the user's intent matches: ${trigger.keywords?.join(", ")}`);
      }

      lines.push("  Steps to follow IN ORDER:");
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.type === "message") {
          lines.push(`    ${i + 1}. Say to the user: "${step.content}"`);
        } else if (step.type === "collect") {
          let instruction = `    ${i + 1}. Collect "${step.field}" from the user by asking: "${step.prompt}"`;
          if (step.validation && step.validation !== "none") {
            const validationRules: Record<string, string> = {
              required: "This field is required — ask again if the user doesn't provide it",
              email: "Must be a valid email address — ask the user to correct it if invalid",
              phone: "Must be a valid phone number — ask the user to correct it if invalid",
              number: "Must be a number — ask the user to provide a numeric value",
            };
            instruction += `. Validation: ${validationRules[step.validation] || step.validation}`;
          }
          lines.push(instruction);
        }
      }
    }

    lines.push("\nIMPORTANT: Only activate a flow when the trigger condition is clearly met. If no flow matches, respond normally. Follow the steps in order — do not skip steps. If collecting data, wait for the user to respond before moving to the next step.");
    lines.push("--- END FLOWS ---");

    return lines.join("\n");
  }

  /**
   * Build system prompt restrictions from guardrails configuration.
   * Returns empty string if guardrails are not enabled.
   */
  private buildGuardrailsPrompt(guardrails: Record<string, unknown> | null): string {
    if (!guardrails || !guardrails.enabled) return "";

    const lines: string[] = [
      "\n\n--- GUARDRAILS (MANDATORY RULES) ---",
      "You MUST follow these safety rules at all times. These override any other instructions:",
    ];

    // Blocked topics
    const blockedTopics = guardrails.blocked_topics as string[] | undefined;
    if (blockedTopics && blockedTopics.length > 0) {
      lines.push(`\n**BLOCKED TOPICS** — You must NEVER discuss or provide information about:`);
      for (const topic of blockedTopics) {
        lines.push(`  - ${topic}`);
      }
      const blockedResponse = (guardrails.blocked_response as string) || "I can only help with questions related to our products and services. Is there something else I can assist you with?";
      lines.push(`  If a user asks about any blocked topic, respond ONLY with: "${blockedResponse}"`);
    }

    // Allowed topics (if configured, restricts to ONLY these)
    const allowedTopics = guardrails.allowed_topics as string[] | undefined;
    if (allowedTopics && allowedTopics.length > 0) {
      lines.push(`\n**ALLOWED TOPICS** — You may ONLY discuss these topics:`);
      for (const topic of allowedTopics) {
        lines.push(`  - ${topic}`);
      }
      lines.push("  If a user asks about anything not in this list, politely redirect them.");
    }

    // Hallucination guard
    if (guardrails.hallucination_guard) {
      lines.push(`\n**HALLUCINATION GUARD** — If the answer is NOT clearly available in the provided knowledge base or conversation context, you MUST say "I don't have that information right now" or similar. Do NOT make up answers, guess, or provide information you're not certain about.`);
    }

    // Knowledge base requirement
    if (guardrails.require_knowledge_base) {
      lines.push(`\n**KNOWLEDGE-ONLY MODE** — ONLY answer questions if the answer can be found in the provided knowledge base. If the knowledge base doesn't contain relevant info, say so.`);
    }

    // Max response length
    const maxLength = guardrails.max_response_length as number | undefined;
    if (maxLength && maxLength > 0) {
      lines.push(`\n**RESPONSE LENGTH** — Keep your responses concise. Maximum approximately ${maxLength} characters.`);
    }

    // PII redaction
    if (guardrails.pii_redaction) {
      lines.push(`\n**PII PROTECTION** — Never repeat sensitive personal information like credit card numbers, Social Security numbers, or passwords back to the user. If they share such info, acknowledge receipt without echoing the sensitive data.`);
    }

    // Custom rules
    const customRules = guardrails.custom_rules as string[] | undefined;
    if (customRules && customRules.length > 0) {
      lines.push(`\n**CUSTOM RULES** — You must also follow these specific rules:`);
      for (const rule of customRules) {
        lines.push(`  - ${rule}`);
      }
    }

    lines.push("\n--- END GUARDRAILS ---");

    return lines.join("\n");
  }
}

export const chatService = new ChatService();
