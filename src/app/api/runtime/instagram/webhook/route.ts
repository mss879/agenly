import { NextRequest, NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram-service";

/**
 * Shared handler: processes BOTH webhook verification and incoming DMs.
 * Mirrors the WhatsApp webhook pattern.
 */
async function handleWebhook(request: NextRequest) {
  const method = request.method;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[Instagram Webhook] ${method} received | mode=${mode} | hasChallenge=${!!challenge}`);

  // ─── Verification request (Meta sends hub.mode=subscribe) ───
  if (mode === "subscribe" && challenge) {
    if (token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log("[Instagram Webhook] ✅ Verification successful");
      return new NextResponse(challenge, { status: 200 });
    }
    console.error("[Instagram Webhook] ❌ Verification failed — token mismatch");
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  // ─── Incoming DM webhook (POST body) ───
  try {
    const bodyText = await request.text();

    if (!bodyText || bodyText.length < 2) {
      console.log("[Instagram Webhook] Empty body — acknowledging");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(`[Instagram Webhook] Body (${bodyText.length} chars):`, bodyText.slice(0, 500));

    const body = JSON.parse(bodyText);

    // Parse the webhook payload
    const payload = instagramService.parseIncomingWebhook(body);

    if (!payload) {
      console.log("[Instagram Webhook] No actionable messages in payload — acknowledging");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(
      `[Instagram Webhook] Processing ${payload.messagingEntries.length} message(s) for IGSID ${payload.recipientId}`
    );

    // Process each message
    const processingPromises = payload.messagingEntries.map((entry) =>
      instagramService
        .handleIncomingMessage(entry)
        .catch((err) => {
          console.error("[Instagram Webhook] Error processing message:", err);
        })
    );

    await Promise.all(processingPromises);

    console.log("[Instagram Webhook] All messages processed successfully");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[Instagram Webhook] Error:", error);
    // Always return 200 to Meta to avoid retries
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// Both GET and POST use the same handler
export async function GET(request: NextRequest) {
  return handleWebhook(request);
}

export async function POST(request: NextRequest) {
  return handleWebhook(request);
}
