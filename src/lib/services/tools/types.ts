// ─── Tool Executor Types ───

export interface ToolAction {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required: string[];
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object";
  description: string;
  enum?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message: string; // Human-readable summary for the AI to relay
}

export interface ToolExecutor {
  provider: string;
  displayName: string;
  description: string;
  actions: ToolAction[];
  execute(
    action: string,
    params: Record<string, unknown>,
    credentials: Record<string, string>,
    config?: Record<string, unknown>
  ): Promise<ToolResult>;
}

/** Credentials schema for each provider (what fields the user needs to fill) */
export interface ProviderCredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea";
  placeholder: string;
  helpText?: string;
}

export interface ProviderConfig {
  provider: string;
  displayName: string;
  description: string;
  category: "scheduling" | "crm" | "ecommerce" | "productivity" | "email";
  icon: string; // lucide icon name
  color: string; // gradient colors
  credentialFields: ProviderCredentialField[];
  configFields?: ProviderCredentialField[];
}
