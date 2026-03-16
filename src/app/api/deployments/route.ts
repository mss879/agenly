import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deploymentService } from "@/lib/services/deployment-service";
import { createDeploymentSchema } from "@/lib/schemas";

// POST /api/deployments — create a new deployment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createDeploymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id")
      .eq("id", parsed.data.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const deployment = await deploymentService.createDeployment(
      parsed.data.agent_id,
      agent.workspace_id
    );

    // Auto-activate the agent when deployed
    await admin
      .from("agents")
      .update({ status: "active" })
      .eq("id", parsed.data.agent_id);

    const snippet = deploymentService.generateSnippet(deployment.deployment_key);

    return NextResponse.json({ deployment, snippet }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/deployments error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/deployments — list deployments for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const agentId = request.nextUrl.searchParams.get("agentId");

    let query = admin
      .from("agent_deployments")
      .select("*, agent_domains(*)")
      .order("created_at", { ascending: false });

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data: deployments, error } = await query;
    if (error) throw error;

    return NextResponse.json({ deployments: deployments || [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/deployments error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
