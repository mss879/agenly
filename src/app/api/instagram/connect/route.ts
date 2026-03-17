import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/instagram/connect?agentId=xxx — initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = `${request.nextUrl.origin}/api/instagram/callback`;

    if (!appId) {
      return NextResponse.json({ error: "Instagram App ID not configured" }, { status: 500 });
    }

    // Build Instagram OAuth URL
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "instagram_business_basic,instagram_business_manage_messages",
      response_type: "code",
      state: agentId, // pass agentId through OAuth state
    });

    const oauthUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

    return NextResponse.json({ url: oauthUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/instagram/connect error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
