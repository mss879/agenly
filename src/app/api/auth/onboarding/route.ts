import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/onboarding — save onboarding responses
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const admin = createAdminClient();

    // Upsert onboarding responses
    const { error: onboardingError } = await admin
      .from("onboarding_responses")
      .upsert({
        user_id: user.id,
        experience_level: body.experience_level || null,
        has_created_agent_before: body.has_created_agent_before ?? null,
        role_title: body.role_title || null,
        company_size: body.company_size || null,
        primary_use_case: body.primary_use_case || null,
        how_heard_about_us: body.how_heard_about_us || null,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (onboardingError) throw onboardingError;

    // Mark onboarding as completed
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
