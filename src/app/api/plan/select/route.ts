import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activateTrial, getUserWorkspaceId } from "@/lib/services/plan-service";
import type { PlanName } from "@/lib/plan-config";

// POST /api/plan/select — user selects a plan and starts trial
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { plan } = body;

    const validPlans: PlanName[] = ["starter", "pro", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const workspaceId = await getUserWorkspaceId(user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const result = await activateTrial(workspaceId, plan as PlanName);

    return NextResponse.json({
      success: true,
      plan,
      trialEnd: result.trialEnd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
