import { createClient } from "@supabase/supabase-js";

// ─── Netlify Function v2: Instagram Webhook ───
// Handles Instagram DM webhook events (verification + incoming messages).

export default async (request) => {
  const url = new URL(request.url);
  const method = request.method;

  console.log(`[IG Function] ${method} request received`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ─── Webhook Verification (Meta sends GET with hub.* params) ───
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;
    if (token === verifyToken) {
      console.log("[IG Function] ✅ Verification successful");
      return new Response(challenge, { status: 200 });
    }
    console.error("[IG Function] ❌ Verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // ─── Incoming Message (Meta sends POST with JSON body) ───
  try {
    const bodyText = await request.text();
    console.log(`[IG Function] Body length: ${bodyText.length}`);
    console.log(`[IG Function] Body: ${bodyText.slice(0, 500)}`);

    if (!bodyText || bodyText.length < 2) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);

    // Instagram webhook format
    if (body.object !== "instagram") {
      console.log(`[IG Function] Not an Instagram event: ${body.object}`);
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const entry = body?.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging || !messaging.message) {
      console.log("[IG Function] No message in payload — echo/read event, acknowledging");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Skip echo messages (messages sent by us)
    if (messaging.message.is_echo) {
      console.log("[IG Function] Echo message, skipping");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id; // our IG user ID
    const messageText = messaging.message.text;
    const messageId = messaging.message.mid;

    if (!messageText) {
      console.log("[IG Function] Non-text message (attachment/media), skipping");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[IG Function] Message from ${senderId}: "${messageText.slice(0, 80)}"`);

    // ─── Look up channel by Instagram user ID ───
    const { data: channel } = await supabase
      .from("instagram_channels")
      .select("id, agent_id, access_token, agents(id, workspace_id, system_prompt, chat_model)")
      .eq("instagram_user_id", recipientId)
      .eq("is_active", true)
      .maybeSingle();

    if (!channel || !channel.agents) {
      console.error(`[IG Function] No channel found for IG user ${recipientId}`);
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = channel.agents;
    const accessToken = channel.access_token;

    console.log(`[IG Function] Matched agent: ${agent.id} (${agent.chat_model})`);

    // Get or create conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("mode", "production")
      .filter("metadata->>instagram_sender_id", "eq", senderId)
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
          metadata: { instagram_sender_id: senderId, channel: "instagram" },
        })
        .select("id")
        .single();

      if (convError) {
        console.error("[IG Function] Conv create failed:", convError.message);
        throw convError;
      }
      conversationId = newConv.id;
    }

    // ─── Knowledge Base Retrieval ───
    let contextText = "";
    try {
      const embRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: messageText }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (embRes.ok) {
        const embData = await embRes.json();
        const queryEmbedding = embData?.embedding?.values;

        if (queryEmbedding && queryEmbedding.length > 0) {
          const { data: matches } = await supabase.rpc(
            "match_knowledge_embeddings",
            {
              query_embedding: JSON.stringify(queryEmbedding),
              match_agent_id: agent.id,
              match_count: 5,
              match_threshold: 0.3,
            }
          );

          if (matches && matches.length > 0) {
            const chunkIds = matches.map((m) => m.chunk_id);
            const { data: chunks } = await supabase
              .from("knowledge_chunks")
              .select("id, content")
              .in("id", chunkIds);

            if (chunks && chunks.length > 0) {
              const sortedChunks = chunkIds
                .map((id) => chunks.find((c) => c.id === id))
                .filter(Boolean);

              contextText = `\n\nRelevant knowledge:\n${sortedChunks
                .map((c, i) => `[${i + 1}] ${c.content}`)
                .join("\n\n")}`;
              console.log(`[IG Function] Added ${sortedChunks.length} knowledge chunks`);
            }
          }
        }
      }
    } catch (e) {
      console.error("[IG Function] Knowledge retrieval error:", e);
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

    // Build Gemini request
    const model = agent.chat_model || "gemini-2.0-flash";
    const basePrompt = agent.system_prompt || "You are a helpful AI assistant.";
    const systemPrompt = `${basePrompt}${contextText}

Instructions:
- Answer based on the provided knowledge when available.
- If you don't know the answer, say so honestly.
- Be helpful, concise, and professional.
- Keep responses under 1000 characters for Instagram DMs.`;

    const geminiBody = {
      contents: [
        ...history,
        { role: "user", parts: [{ text: messageText }] },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    };

    console.log(`[IG Function] Calling Gemini ${model}...`);

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
      console.error(`[IG Function] Gemini error ${geminiRes.status}:`, errText);
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I could not generate a response.";

    console.log(`[IG Function] AI response: "${aiResponse.slice(0, 100)}..."`);

    // Save messages
    await supabase.from("messages").insert([
      { conversation_id: conversationId, role: "user", content: messageText },
      { conversation_id: conversationId, role: "assistant", content: aiResponse },
    ]);

    // Send reply via Instagram Graph API
    const sendRes = await fetch(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: aiResponse },
        }),
      }
    );

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error(`[IG Function] Send failed: ${sendRes.status}`, err);
      throw new Error(`Instagram send failed: ${sendRes.status}`);
    }

    console.log(`[IG Function] ✅ Reply sent to ${senderId}`);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[IG Function] Error:", error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/webhooks/instagram",
};
