// ============================================================
// Plan Configuration — Single Source of Truth
// ============================================================

export type PlanName = "starter" | "pro" | "enterprise";

export interface PlanLimits {
  maxAgents: number;
  maxMessagesPerMonth: number;
  maxTokens: number;
  maxKnowledgeFiles: number;
  maxStorageBytes: number;
  maxDomains: number;
  maxFlows: number;
  maxGuardrailRules: number;
}

export interface PlanFeatures {
  websiteWidget: boolean;
  whatsapp: boolean;
  instagramDM: boolean;
  customBranding: boolean;
  removePoweredBy: boolean;
  detailedAnalytics: boolean;
  billingEstimates: boolean;
  piiRedaction: boolean;
  hallucination_guard: boolean;
  topicBlocking: boolean;
  allowedIntegrations: string[];
}

export interface PlanDefinition {
  name: PlanName;
  displayName: string;
  price: number; // monthly in USD
  description: string;
  limits: PlanLimits;
  features: PlanFeatures;
  popular?: boolean;
}

const ALL_INTEGRATIONS = [
  "calendly", "slack", "google_calendar", "google_sheets",
  "sendgrid", "hubspot", "salesforce", "stripe", "shopify", "zoom",
];

export const PLANS: Record<PlanName, PlanDefinition> = {
  starter: {
    name: "starter",
    displayName: "Starter",
    price: 10,
    description: "Perfect for getting started with AI agents",
    limits: {
      maxAgents: 1,
      maxMessagesPerMonth: 500,
      maxTokens: 500_000,
      maxKnowledgeFiles: 5,
      maxStorageBytes: 100 * 1024 * 1024, // 100MB
      maxDomains: 0,
      maxFlows: 0,
      maxGuardrailRules: 0,
    },
    features: {
      websiteWidget: true,
      whatsapp: false,
      instagramDM: false,
      customBranding: false,
      removePoweredBy: false,
      detailedAnalytics: false,
      billingEstimates: false,
      piiRedaction: false,
      hallucination_guard: false,
      topicBlocking: false,
      allowedIntegrations: ["calendly"],
    },
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    price: 29,
    description: "For growing businesses that need more power",
    popular: true,
    limits: {
      maxAgents: 5,
      maxMessagesPerMonth: 5000,
      maxTokens: 5_000_000,
      maxKnowledgeFiles: 50,
      maxStorageBytes: 1024 * 1024 * 1024, // 1GB
      maxDomains: 3,
      maxFlows: 3,
      maxGuardrailRules: 3,
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      instagramDM: false,
      customBranding: true,
      removePoweredBy: false,
      detailedAnalytics: true,
      billingEstimates: true,
      piiRedaction: false,
      hallucination_guard: false,
      topicBlocking: true,
      allowedIntegrations: ["calendly", "slack", "google_calendar", "google_sheets", "sendgrid"],
    },
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    price: 99,
    description: "Unlimited power for large-scale operations",
    limits: {
      maxAgents: Infinity,
      maxMessagesPerMonth: 50_000,
      maxTokens: 50_000_000,
      maxKnowledgeFiles: Infinity,
      maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
      maxDomains: Infinity,
      maxFlows: Infinity,
      maxGuardrailRules: Infinity,
    },
    features: {
      websiteWidget: true,
      whatsapp: true,
      instagramDM: true,
      customBranding: true,
      removePoweredBy: true,
      detailedAnalytics: true,
      billingEstimates: true,
      piiRedaction: true,
      hallucination_guard: true,
      topicBlocking: true,
      allowedIntegrations: ALL_INTEGRATIONS,
    },
  },
};

// Plan comparison features for the pricing page
export const PLAN_COMPARISON_FEATURES = [
  { label: "AI Agents", key: "maxAgents", format: (v: number) => v === Infinity ? "Unlimited" : String(v) },
  { label: "Messages / mo", key: "maxMessagesPerMonth", format: (v: number) => v.toLocaleString() },
  { label: "Tokens", key: "maxTokens", format: (v: number) => v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}K` },
  { label: "Knowledge Files", key: "maxKnowledgeFiles", format: (v: number) => v === Infinity ? "Unlimited" : String(v) },
  { label: "Storage", key: "maxStorageBytes", format: (v: number) => v >= 1024 * 1024 * 1024 ? `${v / (1024 * 1024 * 1024)} GB` : `${v / (1024 * 1024)} MB` },
];

export const TRIAL_DURATION_DAYS = 2;

// Stripe Price ID mapping (from env vars)
export function getStripePriceId(plan: PlanName): string {
  const map: Record<PlanName, string> = {
    starter: process.env.STRIPE_PRICE_STARTER || "",
    pro: process.env.STRIPE_PRICE_PRO || "",
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "",
  };
  return map[plan];
}

// Check if a plan has access to a feature
export function planHasFeature(plan: PlanName, feature: keyof PlanFeatures): boolean {
  return !!PLANS[plan]?.features[feature];
}

// Get limit value for a plan
export function getPlanLimit(plan: PlanName, limit: keyof PlanLimits): number {
  return PLANS[plan]?.limits[limit] ?? 0;
}
