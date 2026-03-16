import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingEstimate } from "@/lib/types";

export class BillingService {
  private supabase = createAdminClient();

  /**
   * Calculate billing estimate for a workspace for a given month.
   */
  async calculateBillingEstimate(
    workspaceId: string,
    month?: string
  ): Promise<BillingEstimate> {
    // Default to current month
    const now = new Date();
    const monthStr = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Fetch billing settings
    const { data: settings } = await this.supabase
      .from("workspace_billing_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    // Use defaults if no settings exist
    const planName = settings?.plan_name || "starter";
    const monthlyBasePrice = Number(settings?.monthly_base_price) || 0;
    const includedTokens = Number(settings?.included_tokens) || 1_000_000;
    const tokenOveragePrice = Number(settings?.token_overage_price) || 0.0001;
    const includedStorageBytes = Number(settings?.included_storage_bytes) || 1_073_741_824;
    const storageOveragePrice = Number(settings?.storage_overage_price) || 0.00000001;
    const requestPrice = Number(settings?.request_price) || 0;

    // Fetch monthly rollup
    const { data: rollups } = await this.supabase
      .from("usage_monthly_rollups")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("month", monthStr);

    // Aggregate all rollups for this workspace month
    let totalTokens = 0;
    let totalStorageBytes = 0;
    let totalProviderCost = 0;
    let totalRequestCount = 0;

    (rollups || []).forEach((r) => {
      totalTokens += Number(r.total_token_count);
      totalStorageBytes += Number(r.storage_bytes_delta);
      totalProviderCost += Number(r.provider_cost_estimate);
      totalRequestCount += Number(r.request_count);
    });

    // Calculate overages
    const overageTokens = Math.max(0, totalTokens - includedTokens);
    const tokenOverageCharge = overageTokens * tokenOveragePrice;

    const overageStorage = Math.max(0, totalStorageBytes - includedStorageBytes);
    const storageOverageCharge = overageStorage * storageOveragePrice;

    const requestCharge = totalRequestCount * requestPrice;

    const totalEstimatedCharge =
      monthlyBasePrice + tokenOverageCharge + storageOverageCharge + requestCharge;

    return {
      workspace_id: workspaceId,
      month: monthStr,
      plan_name: planName,
      monthly_base_price: monthlyBasePrice,
      total_tokens_used: totalTokens,
      included_tokens: includedTokens,
      overage_tokens: overageTokens,
      token_overage_charge: tokenOverageCharge,
      total_storage_bytes: totalStorageBytes,
      included_storage_bytes: includedStorageBytes,
      overage_storage_bytes: overageStorage,
      storage_overage_charge: storageOverageCharge,
      total_provider_cost: totalProviderCost,
      total_estimated_charge: totalEstimatedCharge,
      request_count: totalRequestCount,
      request_charge: requestCharge,
    };
  }
}

export const billingService = new BillingService();
