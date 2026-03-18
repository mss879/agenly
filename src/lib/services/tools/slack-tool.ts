import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "send_message",
    description: "Send a text message to a Slack channel via webhook.",
    parameters: {
      text: { type: "string", description: "The message text to send to the Slack channel" },
    },
    required: ["text"],
  },
  {
    name: "send_formatted_message",
    description: "Send a richly formatted message to Slack with a title, color, and fields.",
    parameters: {
      title: { type: "string", description: "Message title/header" },
      text: { type: "string", description: "Main message body" },
      color: { type: "string", description: "Hex color for the sidebar (e.g. '#36a64f' for green, '#ff0000' for red). Defaults to '#7C3AED'." },
      fields: { type: "string", description: "Optional key-value pairs as 'key1:value1,key2:value2' format for structured data" },
    },
    required: ["title", "text"],
  },
];

export const slackTool: ToolExecutor = {
  provider: "slack",
  displayName: "Slack",
  description: "Send notifications and messages to Slack channels",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const webhookUrl = credentials.webhook_url;
    if (!webhookUrl) return { success: false, message: "Slack webhook URL not configured.", error: "Missing webhook_url" };

    try {
      if (action === "send_message") {
        const text = params.text as string;

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) return { success: false, message: "Failed to send Slack message.", error: `Status ${res.status}` };

        return {
          success: true,
          message: "Message sent to Slack successfully.",
        };
      }

      if (action === "send_formatted_message") {
        const title = params.title as string;
        const text = params.text as string;
        const color = (params.color as string) || "#7C3AED";

        const attachment: Record<string, unknown> = {
          color,
          title,
          text,
          ts: Math.floor(Date.now() / 1000),
        };

        // Parse optional fields
        if (params.fields) {
          const fieldsStr = params.fields as string;
          const fields = fieldsStr.split(",").map((pair: string) => {
            const [title, value] = pair.split(":").map((s: string) => s.trim());
            return { title, value, short: true };
          });
          attachment.fields = fields;
        }

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachments: [attachment] }),
        });

        if (!res.ok) return { success: false, message: "Failed to send formatted Slack message.", error: `Status ${res.status}` };

        return {
          success: true,
          message: `Formatted message "${title}" sent to Slack successfully.`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Slack.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
