import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserWorkspaceId, getWorkspacePlan } from "@/lib/services/plan-service";
import { getStripePriceId, PLANS, PlanName } from "@/lib/plan-config";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// POST /api/stripe/checkout — create a Stripe Checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { plan } = body as { plan: PlanName };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = getStripePriceId(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan. Please set STRIPE_PRICE_" + plan.toUpperCase() + " in .env.local" },
        { status: 500 }
      );
    }

    const workspaceId = await getUserWorkspaceId(user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const planInfo = await getWorkspacePlan(workspaceId);

    // Build checkout session
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${origin}/dashboard/billing?cancelled=true`,
      customer_email: user.email || undefined,
      metadata: {
        workspace_id: workspaceId,
        user_id: user.id,
        plan_name: plan,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
          plan_name: plan,
        },
      },
    };

    // If still in trial, give remaining trial days on Stripe too
    if (planInfo?.isTrialActive && planInfo.trialDaysRemaining > 0) {
      sessionParams.subscription_data!.trial_period_days = planInfo.trialDaysRemaining;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Stripe Checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
