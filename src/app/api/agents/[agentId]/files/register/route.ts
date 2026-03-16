import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerFileSchema } from "@/lib/schemas";
import { usageService } from "@/lib/services/usage-service";

// POST /api/agents/[agentId]/files/register
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = registerFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify agent using admin client
    const admin = createAdminClient();
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { data: file, error } = await admin
      .from("knowledge_files")
      .insert({
        workspace_id: agent.workspace_id,
        agent_id: agentId,
        file_name: parsed.data.file_name,
        file_type: parsed.data.file_type,
        file_size: parsed.data.file_size,
        storage_path: parsed.data.storage_path,
        ingestion_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Record file upload usage event
    await usageService.recordUsageEvent({
      workspace_id: agent.workspace_id,
      agent_id: agentId,
      event_type: "file_upload",
      event_source: "file_upload",
      idempotency_key: `upload_${file.id}`,
      storage_bytes_delta: parsed.data.file_size,
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    console.error("POST /api/agents/[agentId]/files/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
