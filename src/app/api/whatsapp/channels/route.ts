import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

// GET /api/whatsapp/channels?agentId=xxx — get WhatsApp channel for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: channel } = await admin
      .from("whatsapp_channels")
      .select("id, phone_number_id, waba_id, phone_display, is_active, verify_token, created_at, updated_at")
      .eq("agent_id", agentId)
      .maybeSingle();

    return NextResponse.json({ channel });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/whatsapp/channels error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/whatsapp/channels — create/connect a WhatsApp channel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { agent_id, phone_number_id, waba_id, access_token, phone_display } = body;

    if (!agent_id || !phone_number_id || !access_token) {
      return NextResponse.json(
        { error: "agent_id, phone_number_id, and access_token are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get agent's workspace
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id")
      .eq("id", agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check for existing channel on this agent
    const { data: existing } = await admin
      .from("whatsapp_channels")
      .select("id")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This agent already has a WhatsApp channel. Disconnect it first." },
        { status: 409 }
      );
    }

    // Generate a unique verify token for this channel
    const verify_token = `wa_${randomBytes(16).toString("hex")}`;

    const { data: channel, error: insertError } = await admin
      .from("whatsapp_channels")
      .insert({
        workspace_id: agent.workspace_id,
        agent_id,
        phone_number_id,
        waba_id: waba_id || "",
        access_token,
        verify_token,
        phone_display: phone_display || "",
        is_active: true,
      })
      .select("id, phone_number_id, waba_id, phone_display, is_active, verify_token, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This phone number is already connected to another agent." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/whatsapp/channels error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/whatsapp/channels?agentId=xxx — disconnect WhatsApp channel
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from("whatsapp_channels")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/whatsapp/channels error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
