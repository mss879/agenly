import { chatService } from "./chat-service";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───

interface InstagramMessage {
  mid: string;       // message ID
  text?: string;     // message text (only for text messages)
}

interface InstagramMessagingEntry {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: InstagramMessage;
}

interface ParsedInstagramPayload {
  recipientId: string;       // your Instagram user ID
  messagingEntries: InstagramMessagingEntry[];
}

// ─── Instagram Service ───

export class InstagramService {
  private supabase = createAdminClient();

  /**
   * Parse an incoming webhook body from Meta (Instagram Messaging).
   * Returns null if the payload doesn't contain messages.
   *
   * Instagram webhook format:
   * {
   *   "object": "instagram",
   *   "entry": [{
   *     "id": "<IGSID>",
   *     "time": 123456,
   *     "messaging": [{
   *       "sender": { "id": "<sender_IGSID>" },
   *       "recipient": { "id": "<your_IGSID>" },
   *       "timestamp": 123456,
   *       "message": { "mid": "...", "text": "..." }
   *     }]
   *   }]
   * }
   */
  parseIncomingWebhook(body: Record<string, unknown>): ParsedInstagramPayload | null {
    try {
      if (body.object !== "instagram") return null;

      const entries = body.entry as Array<Record<string, unknown>>;
      if (!entries || entries.length === 0) return null;

      const entry = entries[0];
      const messaging = entry.messaging as InstagramMessagingEntry[];
      if (!messaging || messaging.length === 0) return null;

      // The recipient ID is your Instagram account's IGSID
      const recipientId = messaging[0]?.recipient?.id;
      if (!recipientId) return null;

      // Filter to only entries that have actual messages (not read receipts, reactions, etc.)
      const messageEntries = messaging.filter((m) => m.message?.text);

      if (messageEntries.length === 0) return null;

      return {
        recipientId,
        messagingEntries: messageEntries,
      };
    } catch (e) {
      console.error("[Instagram] Failed to parse webhook:", e);
      return null;
    }
  }

  /**
   * Send a text message via Instagram Messaging API.
   */
  async sendTextMessage(
    accessToken: string,
    recipientId: string,
    text: string
  ): Promise<void> {
    // Instagram has a 1000 character limit per message
    const chunks = this.splitMessage(text, 950);

    for (const chunk of chunks) {
      const response = await fetch(
        `https://graph.instagram.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: chunk },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[Instagram] Send message failed:", JSON.stringify(error));
        throw new Error(
          `Failed to send Instagram message: ${response.status} ${JSON.stringify(error)}`
        );
      }
    }
  }

  /**
   * Look up which agent is connected to a given Instagram user ID.
   * Queries the instagram_channels table.
   */
  async lookupAgentConfig(instagramUserId: string): Promise<{
    agentId: string;
    workspaceId: string;
    accessToken: string;
  } | null> {
    // Check database for connected Instagram channel
    const { data: channel, error: channelError } = await this.supabase
      .from("instagram_channels")
      .select("agent_id, workspace_id, access_token")
      .eq("instagram_user_id", instagramUserId)
      .eq("is_active", true)
      .single();

    if (channelError || !channel) {
      console.error(
        `[Instagram] No channel found for IGSID ${instagramUserId}:`,
        channelError?.message
      );
      return null;
    }

    console.log(`[Instagram] Found agent ${channel.agent_id} for IGSID ${instagramUserId}`);

    return {
      agentId: channel.agent_id,
      workspaceId: channel.workspace_id,
      accessToken: channel.access_token,
    };
  }

  /**
   * Process an incoming Instagram DM end-to-end:
   * parse → find agent → call AI (with tools) → send reply.
   */
  async handleIncomingMessage(entry: InstagramMessagingEntry): Promise<void> {
    // Only handle text messages
    if (!entry.message?.text) {
      console.log("[Instagram] Skipping non-text message");
      return;
    }

    const userMessage = entry.message.text;
    const senderId = entry.sender.id;
    const recipientId = entry.recipient.id;

    console.log(
      `[Instagram] Incoming from ${senderId}: "${userMessage.slice(0, 80)}..."`
    );

    // Don't respond to messages sent by ourselves (echo prevention)
    if (senderId === recipientId) {
      console.log("[Instagram] Skipping echo message (sent by self)");
      return;
    }

    // Find which agent this Instagram account belongs to
    const config = await this.lookupAgentConfig(recipientId);
    if (!config) {
      console.error(
        `[Instagram] No agent configured for IGSID: ${recipientId}`
      );
      return;
    }

    // Look up or create a conversation for this Instagram sender
    const conversationId = await this.getOrCreateConversation(
      senderId,
      config.agentId,
      config.workspaceId
    );

    try {
      // Call the existing chat service (same pipeline as web widget & WhatsApp)
      // This includes full tool integration (Calendly, Shopify, etc.)
      const result = await chatService.processChat({
        message: userMessage,
        conversationId,
        agentId: config.agentId,
        workspaceId: config.workspaceId,
        mode: "production",
      });

      // Send AI response back via Instagram DM
      await this.sendTextMessage(
        config.accessToken,
        senderId,
        result.response
      );

      console.log(
        `[Instagram] Replied to ${senderId} (${result.tokenUsage.totalTokenCount} tokens${
          result.toolsUsed ? `, tools: ${result.toolsUsed.join(", ")}` : ""
        })`
      );
    } catch (error) {
      console.error("[Instagram] Processing error:", error);

      // Send a fallback error message
      await this.sendTextMessage(
        config.accessToken,
        senderId,
        "Sorry, I encountered an error processing your message. Please try again."
      );
    }
  }

  /**
   * Get or create a conversation for an Instagram sender.
   * Uses metadata to link Instagram user IDs to conversations.
   */
  private async getOrCreateConversation(
    senderId: string,
    agentId: string,
    workspaceId: string
  ): Promise<string> {
    // Look for an existing active conversation from this Instagram user
    const { data: existing } = await this.supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("workspace_id", workspaceId)
      .eq("mode", "production")
      .contains("metadata", { instagram_sender_id: senderId })
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
          instagram_sender_id: senderId,
          channel: "instagram",
        },
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return conv.id;
  }

  /**
   * Split a long message into chunks that fit Instagram's character limit.
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

export const instagramService = new InstagramService();
