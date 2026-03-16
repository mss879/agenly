import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/agents/[agentId]/knowledge — list knowledge files
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
    const { data: files, error } = await admin
      .from("knowledge_files")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ files: files || [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/agents/[agentId]/knowledge error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
