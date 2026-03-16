import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/runtime/widget-config?deploymentKey=xxx
export async function GET(request: NextRequest) {
  try {
    const deploymentKey = request.nextUrl.searchParams.get("deploymentKey");
    if (!deploymentKey) {
      return NextResponse.json({ error: "deploymentKey required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: deployment, error } = await supabase
      .from("agent_deployments")
      .select("id, agent_id, widget_config, status, agents(name, welcome_message, branding, status)")
      .eq("deployment_key", deploymentKey)
      .eq("status", "active")
      .single();

    if (error || !deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    const agent = deployment.agents as unknown as Record<string, unknown>;

    return NextResponse.json({
      agent_id: deployment.agent_id,
      deployment_id: deployment.id,
      branding: agent?.branding || {},
      welcome_message: agent?.welcome_message || "Hello! How can I help you?",
      agent_name: agent?.name || "AI Agent",
      status: agent?.status || "draft",
    });
  } catch (error) {
    console.error("GET /api/runtime/widget-config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
