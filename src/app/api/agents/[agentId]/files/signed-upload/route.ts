import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageService } from "@/lib/services/storage-service";

// POST /api/agents/[agentId]/files/signed-upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileName, fileType, fileSize } = await request.json();
    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    // Verify agent exists using admin client
    const admin = createAdminClient();
    const { data: agent } = await admin
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const result = await storageService.createSignedUploadUrl(
      agent.workspace_id,
      agentId,
      fileName
    );

    return NextResponse.json({
      signedUrl: result.signedUrl,
      path: result.path,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/agents/[agentId]/files/signed-upload error:", msg);
    return NextResponse.json({ error: `Upload URL failed: ${msg}` }, { status: 500 });
  }
}
