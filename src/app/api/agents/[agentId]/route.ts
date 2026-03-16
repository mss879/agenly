import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAgentSchema } from "@/lib/schemas";

// GET /api/agents/[agentId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: agent, error } = await admin
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/agents/[agentId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/agents/[agentId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: agent, error } = await admin
      .from("agents")
      .update(parsed.data)
      .eq("id", agentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to update agent: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ agent });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("PATCH /api/agents/[agentId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
