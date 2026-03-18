import type { ToolExecutor, ToolAction, ProviderConfig } from "./types";
import { calendlyTool } from "./calendly-tool";
import { zoomTool } from "./zoom-tool";
import { googleCalendarTool } from "./google-calendar-tool";
import { hubspotTool } from "./hubspot-tool";
import { salesforceTool } from "./salesforce-tool";
import { shopifyTool } from "./shopify-tool";
import { stripeTool } from "./stripe-tool";
import { googleSheetsTool } from "./google-sheets-tool";
import { slackTool } from "./slack-tool";
import { sendgridTool } from "./sendgrid-tool";

// ─── Tool Executor Registry ───
const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  calendly: calendlyTool,
  zoom: zoomTool,
  google_calendar: googleCalendarTool,
  hubspot: hubspotTool,
  salesforce: salesforceTool,
  shopify: shopifyTool,
  stripe: stripeTool,
  google_sheets: googleSheetsTool,
  slack: slackTool,
  sendgrid: sendgridTool,
};

// ─── Provider Configurations (UI metadata) ───
export const PROVIDER_CONFIGS: ProviderConfig[] = [
  // ── Scheduling ──
  {
    provider: "calendly",
    displayName: "Calendly",
    description: "Generate booking links so customers can schedule meetings",
    category: "scheduling",
    icon: "Calendar",
    color: "from-blue-500 to-blue-600",
    credentialFields: [
      { key: "api_token", label: "Personal Access Token", type: "password", placeholder: "eyJra...", helpText: "Get from Calendly → Integrations → API & Webhooks" },
    ],
  },
  {
    provider: "zoom",
    displayName: "Zoom",
    description: "Create and manage Zoom video meetings",
    category: "scheduling",
    icon: "Video",
    color: "from-blue-600 to-indigo-600",
    credentialFields: [
      { key: "account_id", label: "Account ID", type: "text", placeholder: "Your Zoom Account ID" },
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Server-to-Server OAuth Client ID" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Server-to-Server OAuth Secret" },
    ],
  },
  {
    provider: "google_calendar",
    displayName: "Google Calendar",
    description: "Manage calendar events and check availability",
    category: "scheduling",
    icon: "CalendarDays",
    color: "from-green-500 to-emerald-600",
    credentialFields: [
      { key: "service_account_key", label: "Service Account JSON Key", type: "textarea", placeholder: '{"type":"service_account",...}', helpText: "Paste the entire JSON key file contents" },
    ],
    configFields: [
      { key: "calendar_id", label: "Calendar ID", type: "text", placeholder: "primary", helpText: "Leave as 'primary' for the default calendar" },
    ],
  },
  // ── CRM ──
  {
    provider: "hubspot",
    displayName: "HubSpot",
    description: "Manage contacts and deals in HubSpot CRM",
    category: "crm",
    icon: "Users",
    color: "from-orange-500 to-red-500",
    credentialFields: [
      { key: "access_token", label: "Private App Access Token", type: "password", placeholder: "pat-na1-...", helpText: "Create a Private App in HubSpot → Settings → Integrations" },
    ],
  },
  {
    provider: "salesforce",
    displayName: "Salesforce",
    description: "Manage leads and records in Salesforce CRM",
    category: "crm",
    icon: "Cloud",
    color: "from-sky-500 to-blue-600",
    credentialFields: [
      { key: "access_token", label: "Access Token", type: "password", placeholder: "00D...", helpText: "From Salesforce Connected App or Session ID" },
      { key: "instance_url", label: "Instance URL", type: "text", placeholder: "https://yourorg.salesforce.com" },
    ],
  },
  // ── E-Commerce ──
  {
    provider: "shopify",
    displayName: "Shopify",
    description: "Look up orders, products, and tracking from your store",
    category: "ecommerce",
    icon: "ShoppingBag",
    color: "from-green-500 to-lime-500",
    credentialFields: [
      { key: "access_token", label: "Admin API Access Token", type: "password", placeholder: "shpat_...", helpText: "From Shopify Admin → Apps → Develop Apps" },
      { key: "store_url", label: "Store URL", type: "text", placeholder: "https://your-store.myshopify.com" },
    ],
  },
  {
    provider: "stripe",
    displayName: "Stripe",
    description: "Create payment links and look up charges",
    category: "ecommerce",
    icon: "CreditCard",
    color: "from-violet-500 to-purple-600",
    credentialFields: [
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_...", helpText: "From Stripe Dashboard → Developers → API Keys" },
    ],
  },
  // ── Productivity ──
  {
    provider: "google_sheets",
    displayName: "Google Sheets",
    description: "Read, write, and search spreadsheet data",
    category: "productivity",
    icon: "Table",
    color: "from-emerald-500 to-teal-600",
    credentialFields: [
      { key: "service_account_key", label: "Service Account JSON Key", type: "textarea", placeholder: '{"type":"service_account",...}', helpText: "Share your spreadsheet with the service account email" },
    ],
  },
  {
    provider: "slack",
    displayName: "Slack",
    description: "Send notifications and messages to Slack channels",
    category: "productivity",
    icon: "Hash",
    color: "from-purple-500 to-pink-500",
    credentialFields: [
      { key: "webhook_url", label: "Incoming Webhook URL", type: "password", placeholder: "https://hooks.slack.com/services/T.../B.../...", helpText: "Create at api.slack.com → Your Apps → Incoming Webhooks" },
    ],
  },
  // ── Email ──
  {
    provider: "sendgrid",
    displayName: "SendGrid",
    description: "Send transactional emails (confirmations, reminders, etc.)",
    category: "email",
    icon: "Mail",
    color: "from-cyan-500 to-blue-500",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "SG.xxx...", helpText: "From SendGrid → Settings → API Keys" },
      { key: "from_email", label: "Sender Email", type: "text", placeholder: "noreply@yourdomain.com", helpText: "Must be a verified sender in SendGrid" },
      { key: "from_name", label: "Sender Name", type: "text", placeholder: "Your Company" },
    ],
  },
];

/**
 * Get a tool executor by provider key
 */
export function getToolExecutor(provider: string): ToolExecutor | undefined {
  return TOOL_EXECUTORS[provider];
}

/**
 * Get the provider config (UI metadata) by provider key
 */
export function getProviderConfig(provider: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find((p) => p.provider === provider);
}

/**
 * Build Gemini-compatible function declarations for active integrations.
 * This converts our ToolAction[] into the format Gemini expects.
 */
export function buildFunctionDeclarations(
  activeProviders: string[]
): { name: string; description: string; parameters: Record<string, unknown> }[] {
  const declarations: { name: string; description: string; parameters: Record<string, unknown> }[] = [];

  for (const provider of activeProviders) {
    const executor = TOOL_EXECUTORS[provider];
    if (!executor) continue;

    for (const action of executor.actions) {
      // Namespace actions: e.g. "hubspot_create_contact"
      const functionName = `${provider}_${action.name}`;

      const properties: Record<string, unknown> = {};
      for (const [key, param] of Object.entries(action.parameters)) {
        properties[key] = {
          type: param.type === "object" ? "string" : param.type, // Gemini prefers string for complex objects
          description: param.description,
        };
        if (param.enum) {
          (properties[key] as Record<string, unknown>).enum = param.enum;
        }
      }

      declarations.push({
        name: functionName,
        description: `[${executor.displayName}] ${action.description}`,
        parameters: {
          type: "object",
          properties,
          required: action.required,
        },
      });
    }
  }

  return declarations;
}

/**
 * Execute a function call from Gemini. Parses the namespaced function name
 * to determine provider and action, then delegates to the right executor.
 */
export async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  credentialsMap: Record<string, Record<string, string>>,
  configMap: Record<string, Record<string, unknown>>
): Promise<{ provider: string; action: string; result: import("./types").ToolResult }> {
  // Parse "hubspot_create_contact" → provider = "hubspot", action = "create_contact"
  const parts = functionName.split("_");
  let provider = parts[0];
  let action = parts.slice(1).join("_");

  // Handle multi-word provider names (google_calendar, google_sheets)
  if (functionName.startsWith("google_calendar_")) {
    provider = "google_calendar";
    action = functionName.replace("google_calendar_", "");
  } else if (functionName.startsWith("google_sheets_")) {
    provider = "google_sheets";
    action = functionName.replace("google_sheets_", "");
  }

  const executor = TOOL_EXECUTORS[provider];
  if (!executor) {
    return {
      provider,
      action,
      result: { success: false, message: `Unknown provider: ${provider}`, error: "Invalid provider" },
    };
  }

  const credentials = credentialsMap[provider] || {};
  const config = configMap[provider] || {};

  console.log(`[ToolRegistry] Executing ${provider}.${action} with args:`, JSON.stringify(args));
  const result = await executor.execute(action, args, credentials, config);
  console.log(`[ToolRegistry] Result from ${provider}.${action}:`, result.success ? "SUCCESS" : "FAILED", result.message);

  return { provider, action, result };
}

/**
 * Get all available providers
 */
export function getAllProviders(): string[] {
  return Object.keys(TOOL_EXECUTORS);
}

/**
 * Build a tool context summary for the system prompt
 */
export function buildToolContextForPrompt(activeProviders: string[]): string {
  if (activeProviders.length === 0) return "";

  const lines = ["\n\nYou have access to the following tools/integrations that you can use to help the user:"];
  for (const provider of activeProviders) {
    const executor = TOOL_EXECUTORS[provider];
    if (!executor) continue;
    lines.push(`\n- **${executor.displayName}**: ${executor.description}`);
    for (const action of executor.actions) {
      lines.push(`  - ${action.name}: ${action.description}`);
    }
  }
  lines.push("\nWhen a user asks you to perform an action that matches one of these tools, use the appropriate function. Always confirm the action with the user before executing if it involves sending emails, creating records, or making payments.");
  return lines.join("");
}
