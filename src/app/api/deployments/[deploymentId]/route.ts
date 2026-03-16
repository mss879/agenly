import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deploymentService } from "@/lib/services/deployment-service";
import { updateDeploymentSchema, addDomainSchema } from "@/lib/schemas";

// PATCH /api/deployments/[deploymentId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const { deploymentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateDeploymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: deployment, error } = await admin
      .from("agent_deployments")
      .update(parsed.data)
      .eq("id", deploymentId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ deployment });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("PATCH /api/deployments/[deploymentId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/deployments/[deploymentId] — add domain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const { deploymentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = addDomainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: deployment } = await admin
      .from("agent_deployments")
      .select("workspace_id")
      .eq("id", deploymentId)
      .single();

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    const domain = await deploymentService.addDomain(
      deploymentId,
      deployment.workspace_id,
      parsed.data.domain
    );

    return NextResponse.json({ domain }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/deployments/[deploymentId] domain error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/deployments/[deploymentId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const { deploymentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Delete domains first
    await admin
      .from("agent_domains")
      .delete()
      .eq("deployment_id", deploymentId);

    // Delete deployment
    const { error } = await admin
      .from("agent_deployments")
      .delete()
      .eq("id", deploymentId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/deployments/[deploymentId] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
