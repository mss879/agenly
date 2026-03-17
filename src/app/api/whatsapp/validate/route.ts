import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/whatsapp/validate — validate WhatsApp credentials against Graph API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { phone_number_id, access_token } = body;

    if (!phone_number_id || !access_token) {
      return NextResponse.json(
        { error: "phone_number_id and access_token are required" },
        { status: 400 }
      );
    }

    // Call the Graph API to validate the credentials
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating&access_token=${access_token}`
    );

    if (!res.ok) {
      const errorData = await res.json();
      const msg = errorData?.error?.message || "Invalid credentials";
      return NextResponse.json(
        { valid: false, error: msg },
        { status: 200 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      valid: true,
      phone_display: data.display_phone_number || "",
      verified_name: data.verified_name || "",
      quality_rating: data.quality_rating || "",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/whatsapp/validate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
