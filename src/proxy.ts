import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes — redirect unauthenticated to login
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Protect admin routes — redirect unauthenticated to login
  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if logged in and visiting login
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect API routes (except auth signup, runtime, stripe webhook)
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/runtime/") &&
    !pathname.startsWith("/api/auth/signup") &&
    !pathname.startsWith("/api/stripe/webhook") &&
    !user
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trial/subscription expiry check for dashboard routes
  // Skip for billing page (users need to access it to pay) and settings
  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/billing") &&
    !pathname.startsWith("/dashboard/settings")
  ) {
    try {
      // Use Supabase admin client via service role to check billing status
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return []; },
            setAll() {},
          },
        }
      );

      // Check if user is admin (admins bypass trial check)
      const { data: profile } = await adminSupabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        // Check workspace billing status
        const { data: membership } = await adminSupabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membership) {
          const { data: billing } = await adminSupabase
            .from("workspace_billing_settings")
            .select("subscription_status, is_trial_active, trial_ends_at, trial_started_at, selected_plan")
            .eq("workspace_id", membership.workspace_id)
            .single();

          if (billing) {
            const trialEnd = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;
            const trialExpired = billing.is_trial_active && trialEnd && trialEnd < new Date();
            const isExpiredOrCancelled = billing.subscription_status === "expired" || billing.subscription_status === "cancelled";

            // If no plan selected yet, redirect to choose plan
            if (!billing.selected_plan || (!billing.is_trial_active && billing.subscription_status === "trialing" && !billing.trial_started_at)) {
              const url = request.nextUrl.clone();
              url.pathname = "/choose-plan";
              return NextResponse.redirect(url);
            }

            // If trial expired or subscription cancelled, redirect to payment wall
            if (trialExpired || isExpiredOrCancelled) {
              // Update the billing status to expired if trial just expired
              if (trialExpired) {
                await adminSupabase
                  .from("workspace_billing_settings")
                  .update({ is_trial_active: false, subscription_status: "expired" })
                  .eq("workspace_id", membership.workspace_id);
              }

              const url = request.nextUrl.clone();
              url.pathname = "/trial-expired";
              return NextResponse.redirect(url);
            }
          }
        }
      }
    } catch (e) {
      // Don't block on proxy errors — let user through
      console.error("[Proxy] Trial check error:", e);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/api/:path*"],
};

