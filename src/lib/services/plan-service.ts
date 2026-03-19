import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, PlanName, TRIAL_DURATION_DAYS } from "@/lib/plan-config";

export interface WorkspacePlanInfo {
  workspaceId: string;
  selectedPlan: PlanName;
  subscriptionStatus: string;
  isTrialActive: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

// Get workspace plan info
export async function getWorkspacePlan(workspaceId: string): Promise<WorkspacePlanInfo | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_billing_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  if (!data) return null;

  const now = new Date();
  const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const isTrialActive = data.is_trial_active && trialEnd && trialEnd > now;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    workspaceId,
    selectedPlan: (data.selected_plan || data.plan_name || "starter") as PlanName,
    subscriptionStatus: data.subscription_status || "trialing",
    isTrialActive: !!isTrialActive,
    trialStartedAt: data.trial_started_at,
    trialEndsAt: data.trial_ends_at,
    trialDaysRemaining,
    stripeSubscriptionId: data.stripe_subscription_id || null,
    stripeCustomerId: data.stripe_customer_id || null,
  };
}

// Activate trial for a workspace
export async function activateTrial(workspaceId: string, plan: PlanName) {
  const admin = createAdminClient();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("workspace_billing_settings")
    .update({
      selected_plan: plan,
      plan_name: plan,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      is_trial_active: true,
      subscription_status: "trialing",
    })
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  return { trialEnd: trialEnd.toISOString() };
}

// Check if a feature is allowed for a workspace
export async function checkFeatureAccess(
  workspaceId: string,
  feature: string
): Promise<{ allowed: boolean; requiredPlan?: string }> {
  const planInfo = await getWorkspacePlan(workspaceId);
  if (!planInfo) return { allowed: false, requiredPlan: "starter" };

  // If trial expired and not paid, block everything
  if (planInfo.subscriptionStatus === "expired" || planInfo.subscriptionStatus === "cancelled") {
    return { allowed: false, requiredPlan: planInfo.selectedPlan };
  }

  const plan = PLANS[planInfo.selectedPlan];
  if (!plan) return { allowed: false, requiredPlan: "starter" };

  const featureValue = plan.features[feature as keyof typeof plan.features];
  if (featureValue === undefined) return { allowed: true }; // Unknown feature = allow
  if (typeof featureValue === "boolean") {
    if (!featureValue) {
      // Find which plan enables it
      const upgradePlan = Object.values(PLANS).find(
        (p) => p.features[feature as keyof typeof p.features] === true && p.price > plan.price
      );
      return { allowed: false, requiredPlan: upgradePlan?.name || "enterprise" };
    }
    return { allowed: true };
  }
  return { allowed: true };
}

// Check if a limit is reached
export async function checkLimit(
  workspaceId: string,
  limitType: string,
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number; requiredPlan?: string }> {
  const planInfo = await getWorkspacePlan(workspaceId);
  if (!planInfo) return { allowed: false, limit: 0, current: currentCount };

  // If trial expired and not paid, block
  if (planInfo.subscriptionStatus === "expired" || planInfo.subscriptionStatus === "cancelled") {
    return { allowed: false, limit: 0, current: currentCount, requiredPlan: planInfo.selectedPlan };
  }

  const plan = PLANS[planInfo.selectedPlan];
  if (!plan) return { allowed: false, limit: 0, current: currentCount };

  const limit = plan.limits[limitType as keyof typeof plan.limits] ?? Infinity;
  if (currentCount >= limit) {
    const upgradePlan = Object.values(PLANS).find(
      (p) => (p.limits[limitType as keyof typeof p.limits] ?? 0) > limit
    );
    return { allowed: false, limit, current: currentCount, requiredPlan: upgradePlan?.name || "enterprise" };
  }
  return { allowed: true, limit, current: currentCount };
}

// Check if user is admin (bypasses all limits)
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

// Get user's workspace ID
export async function getUserWorkspaceId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data?.workspace_id || null;
}

// Check trial expiry and update status
export async function checkAndExpireTrials() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("workspace_billing_settings")
    .update({
      is_trial_active: false,
      subscription_status: "expired",
    })
    .eq("is_trial_active", true)
    .lt("trial_ends_at", now);
}
