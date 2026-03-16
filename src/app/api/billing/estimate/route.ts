import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingService } from "@/lib/services/billing-service";

// GET /api/billing/estimate — get billing estimate for current month
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
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const month = request.nextUrl.searchParams.get("month") || undefined;
    const estimate = await billingService.calculateBillingEstimate(
      membership.workspace_id,
      month
    );

    return NextResponse.json({ estimate });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/billing/estimate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
