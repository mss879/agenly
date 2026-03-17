import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/instagram/channels?agentId=xxx — get Instagram channel for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: channel } = await admin
      .from("instagram_channels")
      .select("id, instagram_user_id, username, is_active, token_expires_at, created_at, updated_at")
      .eq("agent_id", agentId)
      .maybeSingle();

    return NextResponse.json({ channel });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/instagram/channels error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/instagram/channels?agentId=xxx — disconnect Instagram channel
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from("instagram_channels")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/instagram/channels error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
