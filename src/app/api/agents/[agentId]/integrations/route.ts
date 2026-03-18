import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { integrationService } from "@/lib/services/integration-service";

// GET /api/agents/[agentId]/integrations — list integrations (masked credentials)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { agentId } = await params;

    // Verify agent ownership
    const adminClient = createAdminClient();
    const { data: agent } = await adminClient
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", agent.workspace_id)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const integrations = await integrationService.getIntegrations(agentId);
    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("GET /api/agents/[agentId]/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/agents/[agentId]/integrations — create/update integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { agentId } = await params;
    const body = await request.json();
    const { provider, credentials, config } = body;

    if (!provider || !credentials) {
      return NextResponse.json({ error: "provider and credentials are required" }, { status: 400 });
    }

    // Verify agent ownership
    const adminClient = createAdminClient();
    const { data: agent } = await adminClient
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", agent.workspace_id)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await integrationService.upsertIntegration({
      agentId,
      workspaceId: agent.workspace_id,
      provider,
      credentials,
      config,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error, tested: false }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `${provider} integration saved and verified!` });
  } catch (error) {
    console.error("POST /api/agents/[agentId]/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId]/integrations — remove integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "provider query param is required" }, { status: 400 });
    }

    // Verify agent ownership
    const adminClient = createAdminClient();
    const { data: agent } = await adminClient
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", agent.workspace_id)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await integrationService.deleteIntegration(agentId, provider);
    return NextResponse.json({ success: true, message: `${provider} integration removed` });
  } catch (error) {
    console.error("DELETE /api/agents/[agentId]/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
