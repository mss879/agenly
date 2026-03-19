import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/stats — admin dashboard live analytics
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Check admin role
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch all stats in parallel
    const [
      totalUsersRes,
      profilesRes,
      billingRes,
      agentsRes,
      conversationsRes,
      messagesRes,
    ] = await Promise.all([
      admin.auth.admin.listUsers(),
      admin.from("user_profiles").select("*", { count: "exact", head: false }).neq("role", "admin"),
      admin.from("workspace_billing_settings").select("*"),
      admin.from("agents").select("*", { count: "exact", head: true }),
      admin.from("conversations").select("*", { count: "exact", head: true }),
      admin.from("messages").select("*", { count: "exact", head: true }),
    ]);

    const totalUsers = totalUsersRes.data?.users?.length || 0;
    const profiles = profilesRes.data || [];
    const billingData = billingRes.data || [];

    // Calculate stats
    const paidUsers = billingData.filter(
      (b) => b.subscription_status === "active"
    ).length;
    const trialUsers = billingData.filter(
      (b) => b.subscription_status === "trialing" || b.is_trial_active
    ).length;
    const cancelledUsers = billingData.filter(
      (b) => b.subscription_status === "cancelled" || b.subscription_status === "expired"
    ).length;

    // Plan distribution
    const planCounts = { starter: 0, pro: 0, enterprise: 0 };
    billingData.forEach((b) => {
      const plan = (b.selected_plan || b.plan_name || "starter") as keyof typeof planCounts;
      if (plan in planCounts) planCounts[plan]++;
    });

    // MRR calculation
    const planPrices: Record<string, number> = { starter: 10, pro: 29, enterprise: 99 };
    const mrr = billingData
      .filter((b) => b.subscription_status === "active")
      .reduce((sum, b) => {
        const plan = b.selected_plan || b.plan_name || "starter";
        return sum + (planPrices[plan] || 0);
      }, 0);

    // Signups today / this week / this month
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const signupsToday = profiles.filter(
      (p) => p.created_at && p.created_at.startsWith(todayStr)
    ).length;
    const signupsThisWeek = profiles.filter(
      (p) => p.created_at && p.created_at >= weekAgo
    ).length;
    const signupsThisMonth = profiles.filter(
      (p) => p.created_at && p.created_at >= monthStart
    ).length;

    return NextResponse.json({
      totalUsers: totalUsers - 1, // Exclude admin
      paidUsers,
      trialUsers,
      cancelledUsers,
      planDistribution: planCounts,
      mrr,
      signups: {
        today: signupsToday,
        thisWeek: signupsThisWeek,
        thisMonth: signupsThisMonth,
      },
      platform: {
        totalAgents: agentsRes.count ?? 0,
        totalConversations: conversationsRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
