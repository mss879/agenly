import { z } from "zod";
import {
  AGENT_TYPES,
  AGENT_STATUSES,
  DEPLOYMENT_STATUSES,
  CONVERSATION_MODES,
  MESSAGE_ROLES,
  USAGE_EVENT_TYPES,
  USAGE_EVENT_SOURCES,
  INGESTION_STATUSES,
} from "@/lib/constants";

// ─── Workspace ───
export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  owner_id: z.string().uuid(),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

// ─── Agent ───
export const agentBrandingSchema = z.object({
  title: z.string().max(100).optional().default(""),
  greeting: z.string().max(500).optional().default(""),
  primary_color: z.string().max(20).optional().default("#6366f1"),
  background_color: z.string().max(20).optional().default("#0f172a"),
  text_color: z.string().max(20).optional().default("#f1f5f9"),
  avatar_url: z.string().url().optional().or(z.literal("")),
  widget_position: z.enum(["bottom-right", "bottom-left"]).optional().default("bottom-right"),
});

export const agentUsageLimitsSchema = z.object({
  max_messages_per_day: z.number().int().positive().optional(),
  max_tokens_per_month: z.number().int().positive().optional(),
  max_storage_bytes: z.number().int().positive().optional(),
});

export const agentSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(AGENT_TYPES),
  system_prompt: z.string().max(10000).default(""),
  welcome_message: z.string().max(1000).default("Hello! How can I help you today?"),
  chat_model: z.string().default("gemini-3.1-pro-preview"),
  embedding_model: z.string().default("gemini-embedding-2-preview"),
  status: z.enum(AGENT_STATUSES).default("draft"),
  branding: agentBrandingSchema.optional(),
  usage_limits: agentUsageLimitsSchema.optional().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(AGENT_TYPES).default("customer_service"),
  system_prompt: z.string().max(10000).optional().default(""),
  welcome_message: z.string().max(1000).optional().default("Hello! How can I help you today?"),
  chat_model: z.string().optional().default("gemini-3.1-pro-preview"),
  embedding_model: z.string().optional().default("gemini-embedding-2-preview"),
  branding: agentBrandingSchema.optional(),
  usage_limits: agentUsageLimitsSchema.optional().default({}),
});

export const updateAgentSchema = createAgentSchema.partial().extend({
  status: z.enum(AGENT_STATUSES).optional(),
});

// ─── Deployment ───
export const deploymentSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  deployment_key: z.string(),
  widget_config: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(DEPLOYMENT_STATUSES).default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const createDeploymentSchema = z.object({
  agent_id: z.string().uuid(),
});

export const updateDeploymentSchema = z.object({
  status: z.enum(DEPLOYMENT_STATUSES).optional(),
  widget_config: z.record(z.string(), z.unknown()).optional(),
});

export const addDomainSchema = z.object({
  domain: z.string().min(1).max(253),
});

// ─── Knowledge ───
export const knowledgeFileSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  file_name: z.string(),
  file_type: z.string(),
  file_size: z.number().int(),
  storage_path: z.string(),
  ingestion_status: z.enum(INGESTION_STATUSES).default("pending"),
  chunk_count: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const registerFileSchema = z.object({
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  file_size: z.number().int().positive(),
  storage_path: z.string().min(1),
});

// ─── Conversations ───
export const conversationSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  deployment_id: z.string().uuid().nullable(),
  mode: z.enum(CONVERSATION_MODES),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  role: z.enum(MESSAGE_ROLES),
  content: z.string(),
  token_count: z.number().int().optional(),
  created_at: z.string().datetime(),
});

// ─── Chat Runtime ───
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversation_id: z.string().uuid().nullish(),
  agent_id: z.string().uuid(),
  deployment_key: z.string().nullish(),
  mode: z.enum(CONVERSATION_MODES).default("preview"),
});

// ─── Usage ───
export const usageEventSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid().nullable(),
  deployment_id: z.string().uuid().nullable(),
  conversation_id: z.string().uuid().nullable(),
  message_id: z.string().uuid().nullable(),
  event_type: z.enum(USAGE_EVENT_TYPES),
  event_source: z.enum(USAGE_EVENT_SOURCES),
  idempotency_key: z.string(),
  model_name: z.string().nullable(),
  prompt_token_count: z.number().int().default(0),
  output_token_count: z.number().int().default(0),
  total_token_count: z.number().int().default(0),
  cached_content_token_count: z.number().int().default(0),
  thoughts_token_count: z.number().int().default(0),
  embedding_count: z.number().int().default(0),
  chunk_count: z.number().int().default(0),
  storage_bytes_delta: z.number().int().default(0),
  provider_cost_estimate: z.number().default(0),
  billable_units: z.number().default(0),
  metadata_json: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
});

export const createUsageEventSchema = z.object({
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid().nullable().optional(),
  deployment_id: z.string().uuid().nullable().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  message_id: z.string().uuid().nullable().optional(),
  event_type: z.enum(USAGE_EVENT_TYPES),
  event_source: z.enum(USAGE_EVENT_SOURCES),
  idempotency_key: z.string(),
  model_name: z.string().nullable().optional(),
  prompt_token_count: z.number().int().optional().default(0),
  output_token_count: z.number().int().optional().default(0),
  total_token_count: z.number().int().optional().default(0),
  cached_content_token_count: z.number().int().optional().default(0),
  thoughts_token_count: z.number().int().optional().default(0),
  embedding_count: z.number().int().optional().default(0),
  chunk_count: z.number().int().optional().default(0),
  storage_bytes_delta: z.number().int().optional().default(0),
  provider_cost_estimate: z.number().optional().default(0),
  billable_units: z.number().optional().default(0),
  metadata_json: z.record(z.string(), z.unknown()).optional().default({}),
});

// ─── Billing ───
export const billingSettingsSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  plan_name: z.string().default("starter"),
  monthly_base_price: z.number().default(0),
  included_tokens: z.number().int().default(1_000_000),
  token_overage_price: z.number().default(0.0001),
  included_storage_bytes: z.number().int().default(1_073_741_824),
  storage_overage_price: z.number().default(0.00000001),
  request_price: z.number().default(0),
  per_agent_overrides: z.record(z.string(), z.unknown()).default({}),
  stripe_customer_id: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const updateBillingSettingsSchema = z.object({
  plan_name: z.string().optional(),
  monthly_base_price: z.number().optional(),
  included_tokens: z.number().int().optional(),
  token_overage_price: z.number().optional(),
  included_storage_bytes: z.number().int().optional(),
  storage_overage_price: z.number().optional(),
  request_price: z.number().optional(),
  per_agent_overrides: z.record(z.string(), z.unknown()).optional(),
  stripe_customer_id: z.string().nullable().optional(),
});

// ─── Usage Query ───
export const usageQuerySchema = z.object({
  workspace_id: z.string().uuid(),
  agent_id: z.string().uuid().optional(),
  deployment_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  granularity: z.enum(["daily", "monthly"]).optional().default("daily"),
});
