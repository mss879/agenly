import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkspacePlan, getUserWorkspaceId, isAdmin } from "@/lib/services/plan-service";

// GET /api/plan/current — get current user's plan info
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await isAdmin(user.id);
    const workspaceId = await getUserWorkspaceId(user.id);

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const planInfo = await getWorkspacePlan(workspaceId);

    return NextResponse.json({
      ...planInfo,
      isAdmin: adminUser,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
