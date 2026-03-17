import { NextRequest, NextResponse } from "next/server";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * Shared handler: processes BOTH webhook verification and incoming messages.
 * This is needed because Netlify sometimes redirects POST→GET,
 * so we check the request's actual content rather than relying on HTTP method alone.
 */
async function handleWebhook(request: NextRequest) {
  const method = request.method;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[WhatsApp Webhook] ${method} received | mode=${mode} | hasChallenge=${!!challenge}`);

  // ─── Verification request (Meta sends hub.mode=subscribe) ───
  if (mode === "subscribe" && challenge) {
    if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] ✅ Verification successful");
      return new NextResponse(challenge, { status: 200 });
    }
    console.error("[WhatsApp Webhook] ❌ Verification failed — token mismatch");
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  // ─── Incoming message webhook (POST body) ───
  try {
    const bodyText = await request.text();
    
    if (!bodyText || bodyText.length < 2) {
      console.log("[WhatsApp Webhook] Empty body — likely a ping or health check, acknowledging");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(`[WhatsApp Webhook] Body (${bodyText.length} chars):`, bodyText.slice(0, 500));

    const body = JSON.parse(bodyText);

    // Parse the webhook payload
    const payload = whatsappService.parseIncomingWebhook(body);

    if (!payload) {
      console.log("[WhatsApp Webhook] No messages in payload — acknowledging status event");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(
      `[WhatsApp Webhook] Processing ${payload.messages.length} message(s) for phone ${payload.phoneNumberId}`
    );

    // Process each message
    const processingPromises = payload.messages.map((message) =>
      whatsappService
        .handleIncomingMessage(payload.phoneNumberId, message)
        .catch((err) => {
          console.error("[WhatsApp Webhook] Error processing message:", err);
        })
    );

    await Promise.all(processingPromises);

    console.log("[WhatsApp Webhook] All messages processed successfully");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
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
