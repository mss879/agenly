import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Helper to check if current user is admin
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Admin access required", status: 403 };
  }

  return { user, admin };
}

// GET /api/admin/users — list all users with their plan & payment status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { admin } = auth;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const planFilter = searchParams.get("plan") || "";
    const statusFilter = searchParams.get("status") || "";

    // Get all profiles
    let profileQuery = admin
      .from("user_profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    // Get all workspaces with billing
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, name, owner_id, created_at");

    const { data: billingSettings } = await admin
      .from("workspace_billing_settings")
      .select("*");

    // Get all onboarding responses
    const { data: onboardingData } = await admin
      .from("onboarding_responses")
      .select("*");

    // Build enriched user list
    const users = (profiles || []).map((profile) => {
      const workspace = workspaces?.find((w) => w.owner_id === profile.id);
      const billing = workspace
        ? billingSettings?.find((b) => b.workspace_id === workspace.id)
        : null;
      const onboarding = onboardingData?.find((o) => o.user_id === profile.id);

      return {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: "", // Will be fetched from auth
        role: profile.role,
        onboarding_completed: profile.onboarding_completed,
        created_at: profile.created_at,
        workspace: workspace ? {
          id: workspace.id,
          name: workspace.name,
        } : null,
        billing: billing ? {
          plan_name: billing.selected_plan || billing.plan_name || "starter",
          subscription_status: billing.subscription_status || "trialing",
          trial_started_at: billing.trial_started_at,
          trial_ends_at: billing.trial_ends_at,
          is_trial_active: billing.is_trial_active || false,
          stripe_customer_id: billing.stripe_customer_id,
        } : null,
        onboarding: onboarding ? {
          experience_level: onboarding.experience_level,
          has_created_agent_before: onboarding.has_created_agent_before,
          role_title: onboarding.role_title,
          company_size: onboarding.company_size,
          primary_use_case: onboarding.primary_use_case,
          how_heard_about_us: onboarding.how_heard_about_us,
        } : null,
      };
    });

    // Fetch emails from Supabase auth
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers();
    const authMap = new Map(authUsers.map((u) => [u.id, u.email]));

    const enrichedUsers = users.map((u) => ({
      ...u,
      email: authMap.get(u.id) || "Unknown",
    }));

    // Apply filters
    let filtered = enrichedUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.first_name.toLowerCase().includes(s) ||
          u.last_name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    if (planFilter) {
      filtered = filtered.filter((u) => u.billing?.plan_name === planFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((u) => u.billing?.subscription_status === statusFilter);
    }

    return NextResponse.json({
      users: filtered,
      total: filtered.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/users — update a user's plan
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { admin } = auth;

    const body = await request.json();
    const { user_id, plan_name } = body;

    if (!user_id || !plan_name) {
      return NextResponse.json(
        { error: "user_id and plan_name are required" },
        { status: 400 }
      );
    }

    const validPlans = ["starter", "pro", "enterprise"];
    if (!validPlans.includes(plan_name)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

    // Find user's workspace
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user_id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "User has no workspace" }, { status: 404 });
    }

    // Update billing settings
    const { error: updateError } = await admin
      .from("workspace_billing_settings")
      .update({
        plan_name,
        selected_plan: plan_name,
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspace.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
