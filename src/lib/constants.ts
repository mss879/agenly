// ─── AI Models ───
export const CHAT_MODELS = {
  GEMINI_PRO: "gemini-3.1-pro-preview",
} as const;

export const EMBEDDING_MODELS = {
  GEMINI_EMBEDDING: "gemini-embedding-2-preview",
} as const;

export const DEFAULT_CHAT_MODEL = CHAT_MODELS.GEMINI_PRO;
export const DEFAULT_EMBEDDING_MODEL = EMBEDDING_MODELS.GEMINI_EMBEDDING;

// ─── Embedding ───
export const EMBEDDING_DIMENSION = 768;
export const CHUNK_SIZE = 200; // words per chunk — smaller = more focused retrieval
export const CHUNK_OVERLAP = 30; // overlap words between chunks for context continuity
export const TOP_K_RESULTS = 5;

// ─── Agent ───
export const AGENT_TYPES = ["customer_service"] as const;
export const AGENT_STATUSES = ["draft", "active", "paused", "archived"] as const;

// ─── Deployment ───
export const DEPLOYMENT_STATUSES = ["active", "paused", "revoked"] as const;

// ─── Conversations ───
export const CONVERSATION_MODES = ["preview", "production"] as const;
export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;

// ─── Usage ───
export const USAGE_EVENT_TYPES = [
  "chat_request",
  "embedding_job",
  "file_upload",
  "file_deletion",
] as const;

export const USAGE_EVENT_SOURCES = [
  "preview_chat",
  "production_chat",
  "embedding_job",
  "file_upload",
] as const;

// ─── Ingestion ───
export const INGESTION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
] as const;

// ─── Storage ───
export const STORAGE_BUCKET = "knowledge-files";

// ─── Billing ───
export const DEFAULT_PLAN = {
  plan_name: "starter",
  monthly_base_price: 0,
  included_tokens: 1_000_000,
  token_overage_price: 0.0001, // per token
  included_storage_bytes: 1_073_741_824, // 1GB
  storage_overage_price: 0.00000001, // per byte
} as const;

// ─── Internal Cost Estimates (per 1K tokens) ───
export const PROVIDER_COSTS = {
  [CHAT_MODELS.GEMINI_PRO]: {
    prompt_per_1k: 0.00125,
    output_per_1k: 0.005,
  },
  [EMBEDDING_MODELS.GEMINI_EMBEDDING]: {
    per_1k: 0.00001,
  },
} as const;
