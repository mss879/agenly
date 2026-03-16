import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usageService } from "@/lib/services/usage-service";

// GET /api/usage/rollups — get usage rollups
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
      return NextResponse.json({ rollups: [] });
    }

    const agentId = request.nextUrl.searchParams.get("agentId") || undefined;
    const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = request.nextUrl.searchParams.get("endDate") || undefined;
    const granularity = (request.nextUrl.searchParams.get("granularity") || "daily") as "daily" | "monthly";

    const rollups = await usageService.getUsageSummary(membership.workspace_id, {
      agentId,
      startDate,
      endDate,
      granularity,
    });

    return NextResponse.json({ rollups });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/usage/rollups error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
