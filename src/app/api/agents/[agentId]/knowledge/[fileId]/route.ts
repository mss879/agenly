import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageService } from "@/lib/services/storage-service";
import { usageService } from "@/lib/services/usage-service";

// DELETE /api/agents/[agentId]/knowledge/[fileId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  try {
    const { agentId, fileId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get file details
    const { data: file } = await admin
      .from("knowledge_files")
      .select("*")
      .eq("id", fileId)
      .eq("agent_id", agentId)
      .single();

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete embeddings, chunks, then file (cascade handles most)
    await admin.from("knowledge_files").delete().eq("id", fileId);

    // Delete from storage
    try {
      await storageService.deleteFile(file.storage_path);
    } catch (e) {
      console.error("Storage delete error:", e);
    }

    // Record file deletion usage event
    await usageService.recordUsageEvent({
      workspace_id: file.workspace_id,
      agent_id: agentId,
      event_type: "file_deletion",
      event_source: "file_upload",
      idempotency_key: `delete_${fileId}_${Date.now()}`,
      storage_bytes_delta: -file.file_size,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/agents/[agentId]/knowledge/[fileId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
