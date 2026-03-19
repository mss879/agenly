import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentSchema } from "@/lib/schemas";
import { checkLimit, getUserWorkspaceId, isAdmin as checkIsAdmin } from "@/lib/services/plan-service";

// GET /api/agents — list agents for user's workspace
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's workspace (try admin client to bypass RLS for membership lookup)
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ agents: [] });
    }

    const { data: agents, error } = await admin
      .from("agents")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ agents: agents || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/agents error:", message);
    return NextResponse.json({ error: `Failed to list agents: ${message}` }, { status: 500 });
  }
}

// POST /api/agents — create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    console.log("[POST /api/agents] body:", JSON.stringify(body));

    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      console.log("[POST /api/agents] Zod validation failed:", parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    console.log("[POST /api/agents] Zod parsed ok. Looking for workspace for user:", user.id);

    // Use admin client to bypass RLS for workspace lookup  
    const admin = createAdminClient();

    // --- Plan limit check ---
    const userIsAdmin = await checkIsAdmin(user.id);
    if (!userIsAdmin) {
      const wsId = await getUserWorkspaceId(user.id);
      if (wsId) {
        const { count } = await admin
          .from("agents")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId);

        const limitCheck = await checkLimit(wsId, "maxAgents", count ?? 0);
        if (!limitCheck.allowed) {
          return NextResponse.json({
            error: `Agent limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade to ${limitCheck.requiredPlan || "a higher plan"} to create more agents.`,
          }, { status: 403 });
        }
      }
    }

    const { data: membership, error: memberError } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (memberError) {
      console.log("[POST /api/agents] No membership found, auto-creating workspace. Error:", memberError.message);
    }

    if (!membership) {
      // Auto-create workspace for first-time users
      console.log("[POST /api/agents] Creating workspace for user:", user.id);

      const { data: workspace, error: wsError } = await admin
        .from("workspaces")
        .insert({
          name: "My Workspace",
          slug: `ws-${user.id.slice(0, 8)}`,
          owner_id: user.id,
        })
        .select()
        .single();

      if (wsError) {
        console.error("[POST /api/agents] Failed to create workspace:", wsError.message);
        return NextResponse.json({ error: `Failed to create workspace: ${wsError.message}` }, { status: 500 });
      }

      console.log("[POST /api/agents] Workspace created:", workspace.id);

      const { error: memError } = await admin.from("workspace_members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

      if (memError) {
        console.error("[POST /api/agents] Failed to create membership:", memError.message);
        return NextResponse.json({ error: `Failed to create membership: ${memError.message}` }, { status: 500 });
      }

      // Create billing settings
      await admin.from("workspace_billing_settings").insert({
        workspace_id: workspace.id,
      });

      console.log("[POST /api/agents] Creating agent in workspace:", workspace.id);

      const { data: agent, error } = await admin
        .from("agents")
        .insert({
          ...parsed.data,
          workspace_id: workspace.id,
        })
        .select()
        .single();

      if (error) {
        console.error("[POST /api/agents] Failed to create agent:", error.message);
        return NextResponse.json({ error: `Failed to create agent: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ agent }, { status: 201 });
    }

    console.log("[POST /api/agents] Found workspace:", membership.workspace_id, "Creating agent...");

    const { data: agent, error } = await admin
      .from("agents")
      .insert({
        ...parsed.data,
        workspace_id: membership.workspace_id,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/agents] Failed to create agent:", error.message);
      return NextResponse.json({ error: `Failed to create agent: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/agents] Unhandled error:", message);
    return NextResponse.json({ error: `Failed to create agent: ${message}` }, { status: 500 });
  }
}
