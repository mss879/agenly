import { chatService } from "./chat-service";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───

interface WhatsAppIncomingMessage {
  from: string;       // sender phone number e.g. "919876543210"
  id: string;         // message ID
  timestamp: string;
  type: string;       // "text", "image", "audio", etc.
  text?: { body: string };
}

interface ParsedWebhookPayload {
  phoneNumberId: string;
  messages: WhatsAppIncomingMessage[];
  displayPhone?: string;
}

// ─── WhatsApp Service ───

export class WhatsAppService {
  private supabase = createAdminClient();

  /**
   * Parse an incoming webhook body from Meta.
   * Returns null if the payload doesn't contain messages.
   */
  parseIncomingWebhook(body: Record<string, unknown>): ParsedWebhookPayload | null {
    try {
      const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
      if (!entry) return null;

      const changes = (entry.changes as Array<Record<string, unknown>>)?.[0];
      if (!changes) return null;

      const value = changes.value as Record<string, unknown>;
      if (!value) return null;

      const metadata = value.metadata as Record<string, string>;
      const phoneNumberId = metadata?.phone_number_id;
      if (!phoneNumberId) return null;

      const messages = (value.messages as WhatsAppIncomingMessage[]) || [];
      if (messages.length === 0) return null;

      return {
        phoneNumberId,
        messages,
        displayPhone: metadata?.display_phone_number,
      };
    } catch (e) {
      console.error("[WhatsApp] Failed to parse webhook:", e);
      return null;
    }
  }

  /**
   * Send a text message via WhatsApp Cloud API.
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string
  ): Promise<void> {
    // WhatsApp has a 4096 character limit per message
    const chunks = this.splitMessage(text, 4000);

    for (const chunk of chunks) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body: chunk },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[WhatsApp] Send message failed:", JSON.stringify(error));
        throw new Error(
          `Failed to send WhatsApp message: ${response.status} ${JSON.stringify(error)}`
        );
      }
    }
  }

  /**
   * Mark a message as read (blue ticks).
   */
  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string
  ): Promise<void> {
    try {
      await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
          }),
        }
      );
    } catch (e) {
      // Non-critical — just log
      console.error("[WhatsApp] Failed to mark as read:", e);
    }
  }

  /**
   * Look up which agent is connected to a given phone_number_id.
   * For now we use the env variable approach (single agent).
   * Later this will query the whatsapp_channels table.
   */
  async lookupAgentConfig(phoneNumberId: string): Promise<{
    agentId: string;
    workspaceId: string;
    accessToken: string;
    phoneNumberId: string;
  } | null> {
    // Phase 1: Check env variables (single-agent test mode)
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN;

    console.log(`[WhatsApp] lookupAgentConfig: envPhoneId=${envPhoneId}, incoming=${phoneNumberId}, match=${phoneNumberId === envPhoneId}`);

    if (envPhoneId && envToken && phoneNumberId === envPhoneId) {
      // Find the first agent to route messages to (any status — draft, active, etc.)
      const { data: agent, error: agentError } = await this.supabase
        .from("agents")
        .select("id, workspace_id, status")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      console.log(`[WhatsApp] Agent lookup result:`, agent ? `id=${agent.id}, status=${agent.status}` : `not found, error=${agentError?.message}`);

      if (agent) {
        return {
          agentId: agent.id,
          workspaceId: agent.workspace_id,
          accessToken: envToken,
          phoneNumberId: envPhoneId,
        };
      }
    }

    // Phase 2: Check database (multi-agent mode) — for future
    const { data: channel, error: channelError } = await this.supabase
      .from("whatsapp_channels")
      .select("agent_id, workspace_id, access_token, phone_number_id")
      .eq("phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .single();

    console.log(`[WhatsApp] DB channel lookup:`, channel ? `agent=${channel.agent_id}` : `not found, error=${channelError?.message}`);

    if (channel) {
      return {
        agentId: channel.agent_id,
        workspaceId: channel.workspace_id,
        accessToken: channel.access_token,
        phoneNumberId: channel.phone_number_id,
      };
    }

    return null;
  }

  /**
   * Process an incoming WhatsApp message end-to-end:
   * parse → find agent → call AI → send reply.
   */
  async handleIncomingMessage(
    phoneNumberId: string,
    message: WhatsAppIncomingMessage
  ): Promise<void> {
    // Only handle text messages for now
    if (message.type !== "text" || !message.text?.body) {
      console.log(`[WhatsApp] Skipping non-text message type: ${message.type}`);
      return;
    }

    const userMessage = message.text.body;
    const senderPhone = message.from;

    console.log(
      `[WhatsApp] Incoming from ${senderPhone}: "${userMessage.slice(0, 80)}..."`
    );

    // Find which agent this phone number belongs to
    const config = await this.lookupAgentConfig(phoneNumberId);
    if (!config) {
      console.error(
        `[WhatsApp] No agent configured for phone_number_id: ${phoneNumberId}`
      );
      return;
    }

    // Mark message as read (blue ticks)
    await this.markAsRead(config.phoneNumberId, config.accessToken, message.id);

    // Look up or create a conversation for this WhatsApp sender
    const conversationId = await this.getOrCreateConversation(
      senderPhone,
      config.agentId,
      config.workspaceId
    );

    try {
      // Call the existing chat service (same pipeline as web widget)
      const result = await chatService.processChat({
        message: userMessage,
        conversationId,
        agentId: config.agentId,
        workspaceId: config.workspaceId,
        mode: "production",
      });

      // Send AI response back via WhatsApp
      await this.sendTextMessage(
        config.phoneNumberId,
        config.accessToken,
        senderPhone,
        result.response
      );

      console.log(
        `[WhatsApp] Replied to ${senderPhone} (${result.tokenUsage.totalTokenCount} tokens)`
      );
    } catch (error) {
      console.error("[WhatsApp] Processing error:", error);

      // Send a fallback error message
      await this.sendTextMessage(
        config.phoneNumberId,
        config.accessToken,
        senderPhone,
        "Sorry, I encountered an error processing your message. Please try again."
      );
    }
  }

  /**
   * Get or create a conversation for a WhatsApp sender.
   * Uses metadata to link WhatsApp phone numbers to conversations.
   */
  private async getOrCreateConversation(
    senderPhone: string,
    agentId: string,
    workspaceId: string
  ): Promise<string> {
    // Look for an existing active conversation from this phone number
    const { data: existing } = await this.supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("workspace_id", workspaceId)
      .eq("mode", "production")
      .contains("metadata", { whatsapp_phone: senderPhone })
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create a new conversation
    const { data: conv, error } = await this.supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        agent_id: agentId,
        mode: "production",
        metadata: {
          whatsapp_phone: senderPhone,
          channel: "whatsapp",
        },
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return conv.id;
  }

  /**
   * Split a long message into chunks that fit WhatsApp's character limit.
   */
  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Try to split at a natural break point
      let splitIndex = remaining.lastIndexOf("\n", maxLength);
      if (splitIndex < maxLength * 0.5) {
        splitIndex = remaining.lastIndexOf(". ", maxLength);
      }
      if (splitIndex < maxLength * 0.5) {
        splitIndex = remaining.lastIndexOf(" ", maxLength);
      }
      if (splitIndex < maxLength * 0.5) {
        splitIndex = maxLength;
      }

      chunks.push(remaining.slice(0, splitIndex + 1).trim());
      remaining = remaining.slice(splitIndex + 1).trim();
    }

    return chunks;
  }
}

export const whatsappService = new WhatsAppService();
