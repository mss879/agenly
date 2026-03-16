import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateUsageEventInput } from "@/lib/types";

export class UsageService {
  private supabase = createAdminClient();

  /**
   * Record a usage event with idempotency protection.
   */
  async recordUsageEvent(event: CreateUsageEventInput): Promise<void> {
    const { error } = await this.supabase.from("usage_events").insert({
      workspace_id: event.workspace_id,
      agent_id: event.agent_id || null,
      deployment_id: event.deployment_id || null,
      conversation_id: event.conversation_id || null,
      message_id: event.message_id || null,
      event_type: event.event_type,
      event_source: event.event_source,
      idempotency_key: event.idempotency_key,
      model_name: event.model_name || null,
      prompt_token_count: event.prompt_token_count || 0,
      output_token_count: event.output_token_count || 0,
      total_token_count: event.total_token_count || 0,
      cached_content_token_count: event.cached_content_token_count || 0,
      thoughts_token_count: event.thoughts_token_count || 0,
      embedding_count: event.embedding_count || 0,
      chunk_count: event.chunk_count || 0,
      storage_bytes_delta: event.storage_bytes_delta || 0,
      provider_cost_estimate: event.provider_cost_estimate || 0,
      billable_units: event.billable_units || 0,
      metadata_json: event.metadata_json || {},
    });

    // Ignore unique constraint violations (idempotency)
    if (error && !error.message.includes("duplicate key")) {
      throw new Error(`Failed to record usage event: ${error.message}`);
    }

    // Update rollups
    await this.updateDailyRollup(event);
    await this.updateMonthlyRollup(event);
  }

  /**
   * Update or insert daily rollup.
   */
  private async updateDailyRollup(event: CreateUsageEventInput): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const isPreview = event.event_source === "preview_chat";
    const isDeployed = event.event_source === "production_chat";
    const isFileUpload = event.event_type === "file_upload";
    const isChatRequest = event.event_type === "chat_request";

    // Try upsert
    const { error } = await this.supabase.rpc("upsert_daily_rollup", {
      p_workspace_id: event.workspace_id,
      p_agent_id: event.agent_id || null,
      p_date: today,
      p_request_count: isChatRequest ? 1 : 0,
      p_conversation_count: 0, // counted separately
      p_prompt_token_count: event.prompt_token_count || 0,
      p_output_token_count: event.output_token_count || 0,
      p_total_token_count: event.total_token_count || 0,
      p_cached_content_token_count: event.cached_content_token_count || 0,
      p_thoughts_token_count: event.thoughts_token_count || 0,
      p_embedding_count: event.embedding_count || 0,
      p_chunk_count: event.chunk_count || 0,
      p_storage_bytes_delta: event.storage_bytes_delta || 0,
      p_provider_cost_estimate: event.provider_cost_estimate || 0,
      p_billable_units: event.billable_units || 0,
      p_preview_request_count: isPreview && isChatRequest ? 1 : 0,
      p_deployed_request_count: isDeployed && isChatRequest ? 1 : 0,
      p_uploaded_file_count: isFileUpload ? 1 : 0,
    });

    // If the function doesn't exist, fall back to direct upsert
    if (error) {
      await this.directUpsertDailyRollup(event, today);
    }
  }

  private async directUpsertDailyRollup(
    event: CreateUsageEventInput,
    date: string
  ): Promise<void> {
    const isPreview = event.event_source === "preview_chat";
    const isDeployed = event.event_source === "production_chat";
    const isFileUpload = event.event_type === "file_upload";
    const isChatRequest = event.event_type === "chat_request";

    // Check if rollup exists
    const { data: existing } = await this.supabase
      .from("usage_daily_rollups")
      .select("id, request_count, prompt_token_count, output_token_count, total_token_count, cached_content_token_count, thoughts_token_count, embedding_count, chunk_count, storage_bytes_delta, provider_cost_estimate, billable_units, preview_request_count, deployed_request_count, uploaded_file_count")
      .eq("workspace_id", event.workspace_id)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      // Update existing rollup
      await this.supabase
        .from("usage_daily_rollups")
        .update({
          request_count: existing.request_count + (isChatRequest ? 1 : 0),
          prompt_token_count: existing.prompt_token_count + (event.prompt_token_count || 0),
          output_token_count: existing.output_token_count + (event.output_token_count || 0),
          total_token_count: existing.total_token_count + (event.total_token_count || 0),
          cached_content_token_count: existing.cached_content_token_count + (event.cached_content_token_count || 0),
          thoughts_token_count: existing.thoughts_token_count + (event.thoughts_token_count || 0),
          embedding_count: existing.embedding_count + (event.embedding_count || 0),
          chunk_count: existing.chunk_count + (event.chunk_count || 0),
          storage_bytes_delta: existing.storage_bytes_delta + (event.storage_bytes_delta || 0),
          provider_cost_estimate: Number(existing.provider_cost_estimate) + (event.provider_cost_estimate || 0),
          billable_units: Number(existing.billable_units) + (event.billable_units || 0),
          preview_request_count: existing.preview_request_count + (isPreview && isChatRequest ? 1 : 0),
          deployed_request_count: existing.deployed_request_count + (isDeployed && isChatRequest ? 1 : 0),
          uploaded_file_count: existing.uploaded_file_count + (isFileUpload ? 1 : 0),
        })
        .eq("id", existing.id);
    } else {
      // Insert new rollup
      await this.supabase.from("usage_daily_rollups").insert({
        workspace_id: event.workspace_id,
        agent_id: event.agent_id || null,
        date,
        request_count: isChatRequest ? 1 : 0,
        conversation_count: 0,
        prompt_token_count: event.prompt_token_count || 0,
        output_token_count: event.output_token_count || 0,
        total_token_count: event.total_token_count || 0,
        cached_content_token_count: event.cached_content_token_count || 0,
        thoughts_token_count: event.thoughts_token_count || 0,
        embedding_count: event.embedding_count || 0,
        chunk_count: event.chunk_count || 0,
        storage_bytes_delta: event.storage_bytes_delta || 0,
        provider_cost_estimate: event.provider_cost_estimate || 0,
        billable_units: event.billable_units || 0,
        preview_request_count: isPreview && isChatRequest ? 1 : 0,
        deployed_request_count: isDeployed && isChatRequest ? 1 : 0,
        uploaded_file_count: isFileUpload ? 1 : 0,
      });
    }
  }

  /**
   * Update or insert monthly rollup.
   */
  private async updateMonthlyRollup(event: CreateUsageEventInput): Promise<void> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const isPreview = event.event_source === "preview_chat";
    const isDeployed = event.event_source === "production_chat";
    const isFileUpload = event.event_type === "file_upload";
    const isChatRequest = event.event_type === "chat_request";

    const { data: existing } = await this.supabase
      .from("usage_monthly_rollups")
      .select("id, request_count, prompt_token_count, output_token_count, total_token_count, cached_content_token_count, thoughts_token_count, embedding_count, chunk_count, storage_bytes_delta, provider_cost_estimate, billable_units, preview_request_count, deployed_request_count, uploaded_file_count")
      .eq("workspace_id", event.workspace_id)
      .eq("month", month)
      .maybeSingle();

    if (existing) {
      await this.supabase
        .from("usage_monthly_rollups")
        .update({
          request_count: existing.request_count + (isChatRequest ? 1 : 0),
          prompt_token_count: existing.prompt_token_count + (event.prompt_token_count || 0),
          output_token_count: existing.output_token_count + (event.output_token_count || 0),
          total_token_count: existing.total_token_count + (event.total_token_count || 0),
          cached_content_token_count: existing.cached_content_token_count + (event.cached_content_token_count || 0),
          thoughts_token_count: existing.thoughts_token_count + (event.thoughts_token_count || 0),
          embedding_count: existing.embedding_count + (event.embedding_count || 0),
          chunk_count: existing.chunk_count + (event.chunk_count || 0),
          storage_bytes_delta: existing.storage_bytes_delta + (event.storage_bytes_delta || 0),
          provider_cost_estimate: Number(existing.provider_cost_estimate) + (event.provider_cost_estimate || 0),
          billable_units: Number(existing.billable_units) + (event.billable_units || 0),
          preview_request_count: existing.preview_request_count + (isPreview && isChatRequest ? 1 : 0),
          deployed_request_count: existing.deployed_request_count + (isDeployed && isChatRequest ? 1 : 0),
          uploaded_file_count: existing.uploaded_file_count + (isFileUpload ? 1 : 0),
        })
        .eq("id", existing.id);
    } else {
      await this.supabase.from("usage_monthly_rollups").insert({
        workspace_id: event.workspace_id,
        agent_id: event.agent_id || null,
        month,
        request_count: isChatRequest ? 1 : 0,
        conversation_count: 0,
        prompt_token_count: event.prompt_token_count || 0,
        output_token_count: event.output_token_count || 0,
        total_token_count: event.total_token_count || 0,
        cached_content_token_count: event.cached_content_token_count || 0,
        thoughts_token_count: event.thoughts_token_count || 0,
        embedding_count: event.embedding_count || 0,
        chunk_count: event.chunk_count || 0,
        storage_bytes_delta: event.storage_bytes_delta || 0,
        provider_cost_estimate: event.provider_cost_estimate || 0,
        billable_units: event.billable_units || 0,
        preview_request_count: isPreview && isChatRequest ? 1 : 0,
        deployed_request_count: isDeployed && isChatRequest ? 1 : 0,
        uploaded_file_count: isFileUpload ? 1 : 0,
      });
    }
  }

  /**
   * Get usage summary for a workspace.
   */
  async getUsageSummary(
    workspaceId: string,
    options?: {
      agentId?: string;
      startDate?: string;
      endDate?: string;
      granularity?: "daily" | "monthly";
    }
  ) {
    const granularity = options?.granularity || "daily";
    const table = granularity === "daily" ? "usage_daily_rollups" : "usage_monthly_rollups";
    const dateCol = granularity === "daily" ? "date" : "month";

    let query = this.supabase
      .from(table)
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options?.agentId) {
      query = query.eq("agent_id", options.agentId);
    }

    if (options?.startDate) {
      query = query.gte(dateCol, options.startDate);
    }

    if (options?.endDate) {
      query = query.lte(dateCol, options.endDate);
    }

    query = query.order(dateCol, { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get usage summary: ${error.message}`);

    return data || [];
  }

  /**
   * Get raw usage events for a workspace.
   */
  async getUsageEvents(
    workspaceId: string,
    options?: {
      agentId?: string;
      eventType?: string;
      limit?: number;
    }
  ) {
    let query = this.supabase
      .from("usage_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (options?.agentId) {
      query = query.eq("agent_id", options.agentId);
    }

    if (options?.eventType) {
      query = query.eq("event_type", options.eventType);
    }

    query = query.limit(options?.limit || 100);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get usage events: ${error.message}`);

    return data || [];
  }
}

export const usageService = new UsageService();
