import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/instagram/callback?code=XXX&state={agentId} — handle OAuth redirect
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const agentId = request.nextUrl.searchParams.get("state");
    const errorParam = request.nextUrl.searchParams.get("error");

    // User denied permissions
    if (errorParam) {
      return NextResponse.redirect(
        new URL(`/dashboard/agents/${agentId}/deploy?tab=instagram&error=denied`, request.url)
      );
    }

    if (!code || !agentId) {
      return NextResponse.redirect(
        new URL(`/dashboard/agents/${agentId || ""}/deploy?tab=instagram&error=missing_params`, request.url)
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const appId = process.env.INSTAGRAM_APP_ID!;
    const appSecret = process.env.INSTAGRAM_APP_SECRET!;
    const redirectUri = `${request.nextUrl.origin}/api/instagram/callback`;

    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[IG Callback] Token exchange failed:", errText);
      return NextResponse.redirect(
        new URL(`/dashboard/agents/${agentId}/deploy?tab=instagram&error=token_failed`, request.url)
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    const igUserId = String(tokenData.user_id);

    console.log(`[IG Callback] Got short-lived token for user ${igUserId}`);

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
    );

    let accessToken = shortLivedToken;
    let tokenExpiresAt: string | null = null;

    if (longTokenRes.ok) {
      const longTokenData = await longTokenRes.json();
      accessToken = longTokenData.access_token;
      // expires_in is in seconds, typically 5184000 (60 days)
      const expiresInMs = (longTokenData.expires_in || 5184000) * 1000;
      tokenExpiresAt = new Date(Date.now() + expiresInMs).toISOString();
      console.log(`[IG Callback] Got long-lived token, expires: ${tokenExpiresAt}`);
    } else {
      console.warn("[IG Callback] Long-lived token exchange failed, using short-lived");
    }

    // Step 3: Get Instagram user profile
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`
    );

    let username = "";
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      username = profileData.username || "";
      console.log(`[IG Callback] Profile: @${username}`);
    }

    // Step 4: Save to database
    const admin = createAdminClient();

    // Get agent's workspace
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.redirect(
        new URL(`/dashboard/agents/${agentId}/deploy?tab=instagram&error=agent_not_found`, request.url)
      );
    }

    // Check for existing channel
    const { data: existing } = await admin
      .from("instagram_channels")
      .select("id")
      .eq("agent_id", agentId)
      .maybeSingle();

    if (existing) {
      // Update existing channel
      await admin
        .from("instagram_channels")
        .update({
          instagram_user_id: igUserId,
          username,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        })
        .eq("id", existing.id);
    } else {
      // Create new channel
      const { error: insertError } = await admin
        .from("instagram_channels")
        .insert({
          workspace_id: agent.workspace_id,
          agent_id: agentId,
          instagram_user_id: igUserId,
          username,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
        });

      if (insertError) {
        console.error("[IG Callback] Insert error:", insertError.message);
        return NextResponse.redirect(
          new URL(`/dashboard/agents/${agentId}/deploy?tab=instagram&error=save_failed`, request.url)
        );
      }
    }

    console.log(`[IG Callback] ✅ Instagram channel saved for agent ${agentId}`);

    // Redirect back to deploy page with success
    return NextResponse.redirect(
      new URL(`/dashboard/agents/${agentId}/deploy?tab=instagram&connected=true`, request.url)
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[IG Callback] Error:", msg);
    return NextResponse.redirect(
      new URL(`/dashboard?error=instagram_failed`, request.url)
    );
  }
}
