import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "send_email",
    description: "Send a transactional email via SendGrid (e.g., confirmation, reminder, notification).",
    parameters: {
      to_email: { type: "string", description: "Recipient email address" },
      to_name: { type: "string", description: "Recipient name (optional)" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body content (plain text or HTML)" },
      is_html: { type: "boolean", description: "Whether the body is HTML. Defaults to false (plain text)." },
    },
    required: ["to_email", "subject", "body"],
  },
];

export const sendgridTool: ToolExecutor = {
  provider: "sendgrid",
  displayName: "SendGrid",
  description: "Send transactional emails via SendGrid",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const apiKey = credentials.api_key;
    const fromEmail = credentials.from_email;
    const fromName = credentials.from_name || "AI Agent";

    if (!apiKey) return { success: false, message: "SendGrid API key not configured.", error: "Missing api_key" };
    if (!fromEmail) return { success: false, message: "SendGrid sender email not configured.", error: "Missing from_email" };

    try {
      if (action === "send_email") {
        const toEmail = params.to_email as string;
        const toName = params.to_name as string || "";
        const subject = params.subject as string;
        const body = params.body as string;
        const isHtml = params.is_html as boolean || false;

        const content = isHtml
          ? { type: "text/html", value: body }
          : { type: "text/plain", value: body };

        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: toEmail, name: toName }],
            }],
            from: { email: fromEmail, name: fromName },
            subject,
            content: [content],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to send email via SendGrid.", error: JSON.stringify(err) || `Status ${res.status}` };
        }

        return {
          success: true,
          message: `Email sent successfully to ${toEmail} with subject "${subject}".`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to SendGrid.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
