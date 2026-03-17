import { NextRequest, NextResponse } from "next/server";
import { whatsappService } from "@/lib/services/whatsapp-service";

/**
 * GET /api/runtime/whatsapp/webhook
 *
 * Meta sends a GET request to verify the webhook.
 * We must respond with the challenge token if the verify_token matches.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[WhatsApp Webhook] Verification request:", { mode, token: token?.slice(0, 10) + "..." });

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] ✅ Verification successful");
    // Must return the challenge as plain text, not JSON
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("[WhatsApp Webhook] ❌ Verification failed — token mismatch");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/runtime/whatsapp/webhook
 *
 * Meta sends incoming WhatsApp messages here.
 * We parse the message, route it to the right agent, get an AI response, and reply.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[WhatsApp Webhook] POST received, body keys:", Object.keys(body));
    console.log("[WhatsApp Webhook] Raw body:", JSON.stringify(body).slice(0, 500));

    // Parse the webhook payload
    const payload = whatsappService.parseIncomingWebhook(body);

    if (!payload) {
      // Not a message event (could be status update, etc.) — acknowledge it
      console.log("[WhatsApp Webhook] No messages in payload — acknowledging");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(
      `[WhatsApp Webhook] Received ${payload.messages.length} message(s) for phone ${payload.phoneNumberId}`
    );

    // Process each message (usually just one per webhook call)
    const processingPromises = payload.messages.map((message) =>
      whatsappService
        .handleIncomingMessage(payload.phoneNumberId, message)
        .catch((err) => {
          console.error("[WhatsApp Webhook] Error processing message:", err);
        })
    );

    // Wait for all messages to be processed
    await Promise.all(processingPromises);

    console.log("[WhatsApp Webhook] All messages processed successfully");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    // Always return 200 to Meta to avoid retries for malformed payloads
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
