import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usageService } from "@/lib/services/usage-service";

// GET /api/usage — get usage events or summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ events: [] });
    }

    const agentId = request.nextUrl.searchParams.get("agentId") || undefined;
    const eventType = request.nextUrl.searchParams.get("eventType") || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");

    const events = await usageService.getUsageEvents(membership.workspace_id, {
      agentId,
      eventType,
      limit,
    });

    return NextResponse.json({ events });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/usage error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
