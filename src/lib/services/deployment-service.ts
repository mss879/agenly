import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeploymentKey } from "@/lib/utils";

export class DeploymentService {
  private supabase = createAdminClient();

  async createDeployment(agentId: string, workspaceId: string) {
    const key = generateDeploymentKey();

    const { data, error } = await this.supabase
      .from("agent_deployments")
      .insert({
        workspace_id: workspaceId,
        agent_id: agentId,
        deployment_key: key,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create deployment: ${error.message}`);
    return data;
  }

  async validateDeployment(
    deploymentKey: string,
    origin: string | null
  ): Promise<{
    valid: boolean;
    deployment?: Record<string, unknown>;
    agent?: Record<string, unknown>;
    error?: string;
  }> {
    // Look up deployment by key
    const { data: deployment, error } = await this.supabase
      .from("agent_deployments")
      .select("*, agents(*)")
      .eq("deployment_key", deploymentKey)
      .eq("status", "active")
      .single();

    if (error || !deployment) {
      return { valid: false, error: "Invalid or inactive deployment key" };
    }

    // Check agent status
    if (deployment.agents?.status !== "active") {
      return { valid: false, error: "Agent is not active" };
    }

    // Check domain allowlist
    if (origin) {
      const { data: domains } = await this.supabase
        .from("agent_domains")
        .select("domain")
        .eq("deployment_id", deployment.id);

      const allowedDomains = (domains || []).map((d) => d.domain);

      // If domains are configured, validate against them
      if (allowedDomains.length > 0) {
        const originHost = new URL(origin).hostname;
        const isAllowed = allowedDomains.some((d) => {
          // Support wildcard subdomains
          if (d.startsWith("*.")) {
            return originHost.endsWith(d.slice(1)) || originHost === d.slice(2);
          }
          return originHost === d;
        });

        if (!isAllowed) {
          return { valid: false, error: "Domain not allowed" };
        }
      }
    }

    return {
      valid: true,
      deployment,
      agent: deployment.agents,
    };
  }

  async addDomain(deploymentId: string, workspaceId: string, domain: string) {
    const { data, error } = await this.supabase
      .from("agent_domains")
      .insert({
        deployment_id: deploymentId,
        workspace_id: workspaceId,
        domain,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add domain: ${error.message}`);
    return data;
  }

  async removeDomain(domainId: string) {
    const { error } = await this.supabase
      .from("agent_domains")
      .delete()
      .eq("id", domainId);

    if (error) throw new Error(`Failed to remove domain: ${error.message}`);
  }

  async getDomains(deploymentId: string) {
    const { data, error } = await this.supabase
      .from("agent_domains")
      .select("*")
      .eq("deployment_id", deploymentId);

    if (error) throw new Error(`Failed to get domains: ${error.message}`);
    return data || [];
  }

  generateSnippet(deploymentKey: string): string {
    const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000";
    return `<!-- AI Agent Widget -->
<script 
  src="${platformUrl}/widget/loader.js" 
  data-deployment-key="${deploymentKey}"
  async>
</script>`;
  }
}

export const deploymentService = new DeploymentService();
