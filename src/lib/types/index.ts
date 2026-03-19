import { z } from "zod";
import type {
  workspaceSchema,
  agentSchema,
  agentBrandingSchema,
  agentUsageLimitsSchema,
  agentFlowSchema,
  agentFlowStepSchema,
  agentGuardrailsSchema,
  deploymentSchema,
  knowledgeFileSchema,
  conversationSchema,
  messageSchema,
  usageEventSchema,
  billingSettingsSchema,
  createAgentSchema,
  updateAgentSchema,
  createDeploymentSchema,
  updateDeploymentSchema,
  registerFileSchema,
  chatRequestSchema,
  createUsageEventSchema,
  usageQuerySchema,
  updateBillingSettingsSchema,
} from "@/lib/schemas";

// ─── Entity Types ───
export type Workspace = z.infer<typeof workspaceSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type AgentBranding = z.infer<typeof agentBrandingSchema>;
export type AgentUsageLimits = z.infer<typeof agentUsageLimitsSchema>;
export type AgentFlow = z.infer<typeof agentFlowSchema>;
export type AgentFlowStep = z.infer<typeof agentFlowStepSchema>;
export type AgentGuardrails = z.infer<typeof agentGuardrailsSchema>;
export type Deployment = z.infer<typeof deploymentSchema>;
export type KnowledgeFile = z.infer<typeof knowledgeFileSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;
export type BillingSettings = z.infer<typeof billingSettingsSchema>;

// ─── Input Types ───
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateDeploymentInput = z.infer<typeof updateDeploymentSchema>;
export type RegisterFileInput = z.infer<typeof registerFileSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateUsageEventInput = z.input<typeof createUsageEventSchema>;
export type UsageQueryInput = z.infer<typeof usageQuerySchema>;
export type UpdateBillingSettingsInput = z.infer<typeof updateBillingSettingsSchema>;

// ─── Rollup Types ───
export interface UsageRollup {
  workspace_id: string;
  agent_id: string | null;
  period: string; // date for daily, month for monthly
  request_count: number;
  conversation_count: number;
  prompt_token_count: number;
  output_token_count: number;
  total_token_count: number;
  cached_content_token_count: number;
  thoughts_token_count: number;
  embedding_count: number;
  chunk_count: number;
  storage_bytes_delta: number;
  provider_cost_estimate: number;
  billable_units: number;
  preview_request_count: number;
  deployed_request_count: number;
  uploaded_file_count: number;
}

// ─── Billing Estimate ───
export interface BillingEstimate {
  workspace_id: string;
  month: string;
  plan_name: string;
  monthly_base_price: number;
  total_tokens_used: number;
  included_tokens: number;
  overage_tokens: number;
  token_overage_charge: number;
  total_storage_bytes: number;
  included_storage_bytes: number;
  overage_storage_bytes: number;
  storage_overage_charge: number;
  total_provider_cost: number;
  total_estimated_charge: number;
  request_count: number;
  request_charge: number;
}

// ─── Widget Config ───
export interface WidgetConfig {
  agent_id: string;
  deployment_id: string;
  branding: AgentBranding;
  welcome_message: string;
  status: string;
}

// ─── Knowledge Chunk ───
export interface KnowledgeChunk {
  id: string;
  workspace_id: string;
  agent_id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: Record<string, unknown>;
}

// ─── Retrieved Chunk (with similarity) ───
export interface RetrievedChunk extends KnowledgeChunk {
  similarity: number;
}
