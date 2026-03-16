import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/dashboard/stats — live counts for the dashboard cards
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Resolve workspace
    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ agents: 0, conversations: 0, messages: 0, files: 0 });
    }

    const wid = membership.workspace_id;

    // Run all four counts in parallel
    const [agentsRes, convsRes, msgsRes, filesRes] = await Promise.all([
      admin.from("agents").select("*", { count: "exact", head: true }).eq("workspace_id", wid),
      admin.from("conversations").select("*", { count: "exact", head: true }).eq("workspace_id", wid),
      admin.from("messages").select("*", { count: "exact", head: true }).eq("workspace_id", wid),
      admin.from("knowledge_files").select("*", { count: "exact", head: true }).eq("workspace_id", wid),
    ]);

    return NextResponse.json({
      agents: agentsRes.count ?? 0,
      conversations: convsRes.count ?? 0,
      messages: msgsRes.count ?? 0,
      files: filesRes.count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/dashboard/stats error:", message);
    return NextResponse.json(
      { error: `Failed to load stats: ${message}` },
      { status: 500 }
    );
  }
}
