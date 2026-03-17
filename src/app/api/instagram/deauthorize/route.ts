import { NextResponse } from "next/server";

// POST /api/instagram/deauthorize — Meta calls this when user deauthorizes your app
export async function POST() {
  // Meta requires a 200 response; actual cleanup can be done async
  console.log("[IG Deauthorize] Received deauthorize callback");
  return NextResponse.json({ status: "ok" });
}

// GET /api/instagram/data-deletion — Meta data deletion endpoint
export async function GET() {
  return NextResponse.json({
    url: "https://agenly.online/privacy",
    confirmation_code: "agenly_data_deletion",
  });
}
