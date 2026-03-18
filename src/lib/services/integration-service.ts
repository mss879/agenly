import { createAdminClient } from "@/lib/supabase/admin";
import { encryptCredentials, decryptCredentials, maskCredential } from "@/lib/encryption";
import { getToolExecutor } from "./tools/tool-registry";

export interface IntegrationRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  provider: string;
  credentials: Record<string, string>;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaskedIntegration {
  id: string;
  provider: string;
  is_active: boolean;
  config: Record<string, unknown>;
  masked_credentials: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export class IntegrationService {
  private supabase = createAdminClient();

  /**
   * Get all integrations for an agent (credentials returned MASKED)
   */
  async getIntegrations(agentId: string): Promise<MaskedIntegration[]> {
    const { data, error } = await this.supabase
      .from("agent_integrations")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);

    return (data || []).map((row) => {
      let maskedCreds: Record<string, string> = {};
      try {
        const decrypted = decryptCredentials(row.credentials as string);
        maskedCreds = Object.fromEntries(
          Object.entries(decrypted).map(([k, v]) => [k, maskCredential(v)])
        );
      } catch {
        maskedCreds = { error: "Failed to decrypt" };
      }

      return {
        id: row.id,
        provider: row.provider,
        is_active: row.is_active,
        config: (row.config || {}) as Record<string, unknown>,
        masked_credentials: maskedCreds,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  }

  /**
   * Get active integrations with DECRYPTED credentials (for runtime use only)
   */
  async getActiveIntegrationsDecrypted(agentId: string): Promise<{
    providers: string[];
    credentialsMap: Record<string, Record<string, string>>;
    configMap: Record<string, Record<string, unknown>>;
  }> {
    const { data, error } = await this.supabase
      .from("agent_integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true);

    if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);

    const providers: string[] = [];
    const credentialsMap: Record<string, Record<string, string>> = {};
    const configMap: Record<string, Record<string, unknown>> = {};

    for (const row of data || []) {
      try {
        const decrypted = decryptCredentials(row.credentials as string);
        providers.push(row.provider);
        credentialsMap[row.provider] = decrypted;
        configMap[row.provider] = (row.config || {}) as Record<string, unknown>;
      } catch (e) {
        console.error(`[IntegrationService] Failed to decrypt credentials for ${row.provider}:`, e);
      }
    }

    return { providers, credentialsMap, configMap };
  }

  /**
   * Create or update an integration. Tests credentials before saving.
   */
  async upsertIntegration(params: {
    agentId: string;
    workspaceId: string;
    provider: string;
    credentials: Record<string, string>;
    config?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: string }> {
    const { agentId, workspaceId, provider, credentials, config } = params;

    // Test credentials first
    const testResult = await this.testIntegration(provider, credentials);
    if (!testResult.success) {
      return { success: false, error: testResult.error || "Credential validation failed" };
    }

    // Encrypt and save
    const encryptedCreds = encryptCredentials(credentials);

    const { error } = await this.supabase
      .from("agent_integrations")
      .upsert(
        {
          agent_id: agentId,
          workspace_id: workspaceId,
          provider,
          credentials: encryptedCreds,
          config: config || {},
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,provider" }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(agentId: string, provider: string): Promise<void> {
    const { error } = await this.supabase
      .from("agent_integrations")
      .delete()
      .eq("agent_id", agentId)
      .eq("provider", provider);

    if (error) throw new Error(`Failed to delete integration: ${error.message}`);
  }

  /**
   * Toggle integration active/inactive
   */
  async toggleIntegration(agentId: string, provider: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("agent_integrations")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("agent_id", agentId)
      .eq("provider", provider);

    if (error) throw new Error(`Failed to toggle integration: ${error.message}`);
  }

  /**
   * Test credentials by making a lightweight API call
   */
  async testIntegration(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    const executor = getToolExecutor(provider);
    if (!executor) return { success: false, error: `Unknown provider: ${provider}` };

    try {
      switch (provider) {
        case "calendly": {
          const res = await fetch("https://api.calendly.com/users/me", {
            headers: { Authorization: `Bearer ${credentials.api_token}` },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid Calendly token" };
        }

        case "zoom": {
          const tokenRes = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=account_credentials&account_id=${credentials.account_id}`,
          });
          return tokenRes.ok ? { success: true } : { success: false, error: "Invalid Zoom credentials" };
        }

        case "hubspot": {
          const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
            headers: { Authorization: `Bearer ${credentials.access_token}` },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid HubSpot token" };
        }

        case "salesforce": {
          const res = await fetch(`${credentials.instance_url}/services/data/v62.0/limits`, {
            headers: { Authorization: `Bearer ${credentials.access_token}` },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid Salesforce credentials" };
        }

        case "shopify": {
          const storeUrl = credentials.store_url?.replace(/\/$/, "");
          const res = await fetch(`${storeUrl}/admin/api/2024-01/shop.json`, {
            headers: { "X-Shopify-Access-Token": credentials.access_token },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid Shopify credentials" };
        }

        case "stripe": {
          const res = await fetch("https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${credentials.secret_key}` },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid Stripe key" };
        }

        case "google_calendar":
        case "google_sheets": {
          // Validate that the JSON key is parseable, actual auth test happens on use
          try {
            const key = JSON.parse(credentials.service_account_key);
            if (!key.client_email || !key.private_key) {
              return { success: false, error: "Invalid service account key: missing client_email or private_key" };
            }
            return { success: true };
          } catch {
            return { success: false, error: "Invalid JSON in service account key" };
          }
        }

        case "slack": {
          const res = await fetch(credentials.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "✅ Agenly integration test — connection successful!" }),
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid Slack webhook URL" };
        }

        case "sendgrid": {
          const res = await fetch("https://api.sendgrid.com/v3/user/credits", {
            headers: { Authorization: `Bearer ${credentials.api_key}` },
          });
          return res.ok ? { success: true } : { success: false, error: "Invalid SendGrid API key" };
        }

        default:
          return { success: false, error: `No test available for provider: ${provider}` };
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}

export const integrationService = new IntegrationService();
