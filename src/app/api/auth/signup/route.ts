import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/signup — register user, create profile + workspace
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name } = body;

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Email, password, first name, and last name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Create Supabase auth user (no email confirmation)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm — no email verification
    });

    if (authError) {
      // Handle duplicate email
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // 2. Create user profile
    const { error: profileError } = await admin
      .from("user_profiles")
      .insert({
        id: userId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: "user",
        onboarding_completed: false,
      });

    if (profileError) {
      console.error("[Signup] Profile creation failed:", profileError.message);
      // Clean up auth user if profile fails
      await admin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 3. Auto-create workspace
    const workspaceName = `${first_name.trim()}'s Workspace`;
    const slug = `ws-${userId.slice(0, 8)}`;

    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug,
        owner_id: userId,
      })
      .select()
      .single();

    if (wsError) {
      console.error("[Signup] Workspace creation failed:", wsError.message);
      throw wsError;
    }

    // 4. Add workspace membership
    const { error: memError } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    });

    if (memError) {
      console.error("[Signup] Membership creation failed:", memError.message);
      throw memError;
    }

    // 5. Create billing settings
    await admin.from("workspace_billing_settings").insert({
      workspace_id: workspace.id,
    });

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: authData.user.email,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
        workspace: {
          id: workspace.id,
          name: workspaceName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Signup] Error:", message);
    return NextResponse.json(
      { error: `Signup failed: ${message}` },
      { status: 500 }
    );
  }
}
