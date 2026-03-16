import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/services/chat-service";
import { deploymentService } from "@/lib/services/deployment-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { chatRequestSchema } from "@/lib/schemas";

// POST /api/runtime/chat — unified chat endpoint for preview and production
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { message, conversation_id, agent_id, deployment_key, mode } = parsed.data;

    let workspaceId: string;
    let deploymentId: string | undefined;

    if (mode === "production" && deployment_key) {
      // Production mode: validate deployment key and domain
      const origin = request.headers.get("origin") || request.headers.get("referer");
      const validation = await deploymentService.validateDeployment(deployment_key, origin);

      if (!validation.valid) {
        console.error(`[Chat] Deployment validation failed: ${validation.error} (key: ${deployment_key}, origin: ${origin})`);
        return NextResponse.json({ error: validation.error }, { status: 403 });
      }

      workspaceId = (validation.deployment as Record<string, string>).workspace_id;
      deploymentId = (validation.deployment as Record<string, string>).id;
    } else {
      // Preview mode: require authenticated user
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get workspace from agent
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const { data: agent } = await adminClient
        .from("agents")
        .select("workspace_id")
        .eq("id", agent_id)
        .single();

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      workspaceId = agent.workspace_id;
    }

    // Process chat
    const result = await chatService.processChat({
      message,
      conversationId: conversation_id === null ? undefined : conversation_id,
      agentId: agent_id,
      workspaceId,
      mode: mode || "preview",
      deploymentId,
    });

    return NextResponse.json({
      response: result.response,
      conversation_id: result.conversationId,
      message_id: result.messageId,
      token_usage: result.tokenUsage,
    });
  } catch (error) {
    console.error("POST /api/runtime/chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Deployment-Key",
    },
  });
}
