import { createClient } from "@supabase/supabase-js";

// ─── Netlify Function v2: WhatsApp Webhook ───
// Bypasses Next.js routing to avoid Netlify's POST body stripping issue.

export default async (request) => {
  const url = new URL(request.url);
  const method = request.method;

  console.log(`[WA Function] ${method} request received`);

  // ─── Webhook Verification (Meta sends GET with hub.* params) ───
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (token === verifyToken) {
      console.log("[WA Function] ✅ Verification successful");
      return new Response(challenge, { status: 200 });
    }
    console.error("[WA Function] ❌ Verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // ─── Incoming Message (Meta sends POST with JSON body) ───
  try {
    const bodyText = await request.text();
    console.log(`[WA Function] Body length: ${bodyText.length}`);
    console.log(`[WA Function] Body: ${bodyText.slice(0, 500)}`);

    if (!bodyText || bodyText.length < 2) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);

    // Parse the webhook payload
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const metadata = value?.metadata;
    const phoneNumberId = metadata?.phone_number_id;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      console.log("[WA Function] No messages — status event, acknowledging");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = messages[0];
    console.log(`[WA Function] Message from ${message.from}: type=${message.type}`);

    if (message.type !== "text" || !message.text?.body) {
      console.log("[WA Function] Non-text message, skipping");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userMessage = message.text.body;
    const senderPhone = message.from;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    console.log(`[WA Function] Processing: "${userMessage.slice(0, 80)}" from ${senderPhone}`);

    // Mark as read
    try {
      await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: message.id,
        }),
      });
    } catch (e) {
      console.error("[WA Function] Mark read failed:", e);
    }

    // ─── Get AI Response ───
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the first agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, workspace_id, system_prompt, chat_model")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!agent) {
      console.error("[WA Function] No agent found:", agentError?.message);
      await sendWhatsAppMessage(phoneNumberId, accessToken, senderPhone,
        "Sorry, no agent is configured yet.");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[WA Function] Using agent: ${agent.id} (${agent.chat_model})`);

    // Get or create conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("mode", "production")
      .filter("metadata->>whatsapp_phone", "eq", senderPhone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: agent.workspace_id,
          agent_id: agent.id,
          mode: "production",
          metadata: { whatsapp_phone: senderPhone, channel: "whatsapp" },
        })
        .select("id")
        .single();

      if (convError) {
        console.error("[WA Function] Conv create failed:", convError.message);
        throw convError;
      }
      conversationId = newConv.id;
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = (recentMessages || []).reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Build the Gemini request
    const model = agent.chat_model || "gemini-2.0-flash";
    const systemPrompt = agent.system_prompt || "You are a helpful AI assistant.";

    const geminiBody = {
      contents: [
        ...history,
        { role: "user", parts: [{ text: userMessage }] },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    console.log(`[WA Function] Calling Gemini ${model}...`);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(`[WA Function] Gemini error ${geminiRes.status}:`, errText);
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I could not generate a response.";

    console.log(`[WA Function] AI response: "${aiResponse.slice(0, 100)}..."`);

    // Save user message and AI response
    await supabase.from("messages").insert([
      { conversation_id: conversationId, role: "user", content: userMessage },
      { conversation_id: conversationId, role: "assistant", content: aiResponse },
    ]);

    // Send reply via WhatsApp
    await sendWhatsAppMessage(phoneNumberId, accessToken, senderPhone, aiResponse);

    console.log(`[WA Function] ✅ Reply sent to ${senderPhone}`);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WA Function] Error:", error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// ─── Helper: Send WhatsApp Text Message ───
async function sendWhatsAppMessage(phoneNumberId, accessToken, to, text) {
  const chunks = text.length <= 4000 ? [text] : splitText(text, 4000);

  for (const chunk of chunks) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: chunk },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[WA Function] Send failed: ${res.status}`, err);
      throw new Error(`WhatsApp send failed: ${res.status}`);
    }
  }
}

function splitText(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let idx = remaining.lastIndexOf("\n", maxLen);
    if (idx < maxLen * 0.5) idx = remaining.lastIndexOf(". ", maxLen);
    if (idx < maxLen * 0.5) idx = remaining.lastIndexOf(" ", maxLen);
    if (idx < maxLen * 0.5) idx = maxLen;
    chunks.push(remaining.slice(0, idx + 1).trim());
    remaining = remaining.slice(idx + 1).trim();
  }
  return chunks;
}

export const config = {
  path: "/webhooks/whatsapp",
};
