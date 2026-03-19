import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// POST /api/stripe/webhook — handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Stripe Webhook] Signature verification failed:", message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const admin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const planName = session.metadata?.plan_name;

        if (workspaceId) {
          await admin
            .from("workspace_billing_settings")
            .update({
              subscription_status: "active",
              is_trial_active: false,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              selected_plan: planName || "starter",
              plan_name: planName || "starter",
            })
            .eq("workspace_id", workspaceId);

          console.log(`[Stripe Webhook] Checkout completed for workspace ${workspaceId}, plan: ${planName}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          const status = subscription.status === "active" ? "active"
            : subscription.status === "past_due" ? "past_due"
            : subscription.status === "canceled" ? "cancelled"
            : subscription.status === "trialing" ? "trialing"
            : "expired";

          await admin
            .from("workspace_billing_settings")
            .update({
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq("workspace_id", workspaceId);

          console.log(`[Stripe Webhook] Subscription updated for workspace ${workspaceId}: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          await admin
            .from("workspace_billing_settings")
            .update({
              subscription_status: "cancelled",
              is_trial_active: false,
              stripe_subscription_id: null,
            })
            .eq("workspace_id", workspaceId);

          console.log(`[Stripe Webhook] Subscription cancelled for workspace ${workspaceId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | null;

        if (subscriptionId) {
          await admin
            .from("workspace_billing_settings")
            .update({ subscription_status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);

          console.log(`[Stripe Webhook] Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Stripe Webhook] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
