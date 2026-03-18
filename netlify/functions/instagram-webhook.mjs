import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ─── Netlify Function v2: Instagram Webhook ───
// Handles Instagram DM webhook events (verification + incoming messages).
// Now with full tool/function-calling support (Calendly, Shopify, etc.)

// ═══════════════════════════════════════════════════════════
//  DECRYPTION (mirrors src/lib/encryption.ts)
// ═══════════════════════════════════════════════════════════

function decryptCredentials(ciphertext) {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET env var is required");
  const key = crypto.createHash("sha256").update(secret).digest();

  const packed = Buffer.from(ciphertext, "base64");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

// ═══════════════════════════════════════════════════════════
//  TOOL DEFINITIONS — mirrors tool-registry + individual tools
// ═══════════════════════════════════════════════════════════

const TOOL_CATALOG = {
  calendly: {
    displayName: "Calendly",
    description: "Schedule meetings by generating Calendly booking links",
    actions: [
      {
        name: "list_event_types",
        description: "List all available Calendly event types (meeting types) for the user.",
        parameters: {},
        required: [],
      },
      {
        name: "create_scheduling_link",
        description: "Create a single-use Calendly scheduling link that an invitee can use to book a meeting. Returns a unique URL.",
        parameters: {
          event_type_uri: { type: "string", description: "The URI of the event type to create a scheduling link for. Get this from list_event_types first." },
        },
        required: ["event_type_uri"],
      },
    ],
  },
  shopify: {
    displayName: "Shopify",
    description: "Look up orders, products, and tracking from your store",
    actions: [
      {
        name: "search_products",
        description: "Search for products in the Shopify store by title.",
        parameters: {
          query: { type: "string", description: "Product title or keyword to search for" },
        },
        required: ["query"],
      },
      {
        name: "lookup_order",
        description: "Look up an order by its order number or name (e.g. #1001).",
        parameters: {
          order_number: { type: "string", description: "The order number or name to look up (e.g. '1001' or '#1001')" },
        },
        required: ["order_number"],
      },
    ],
  },
  stripe: {
    displayName: "Stripe",
    description: "Create payment links and look up charges",
    actions: [
      {
        name: "create_payment_link",
        description: "Create a Stripe payment link for a given amount and description.",
        parameters: {
          amount: { type: "number", description: "Amount in dollars (e.g. 29.99)" },
          currency: { type: "string", description: "Currency code (e.g. 'usd')" },
          description: { type: "string", description: "Description for the payment" },
        },
        required: ["amount", "currency", "description"],
      },
      {
        name: "lookup_charge",
        description: "Look up a Stripe charge by its ID.",
        parameters: {
          charge_id: { type: "string", description: "The Stripe charge ID (ch_...)" },
        },
        required: ["charge_id"],
      },
    ],
  },
  hubspot: {
    displayName: "HubSpot",
    description: "Manage contacts and deals in HubSpot CRM",
    actions: [
      {
        name: "create_contact",
        description: "Create a new contact in HubSpot CRM.",
        parameters: {
          email: { type: "string", description: "Contact email address" },
          firstname: { type: "string", description: "Contact first name" },
          lastname: { type: "string", description: "Contact last name" },
        },
        required: ["email"],
      },
      {
        name: "search_contacts",
        description: "Search for contacts in HubSpot by email or name.",
        parameters: {
          query: { type: "string", description: "Search query (email, name, etc.)" },
        },
        required: ["query"],
      },
    ],
  },
  slack: {
    displayName: "Slack",
    description: "Send notifications and messages to Slack channels",
    actions: [
      {
        name: "send_message",
        description: "Send a message to the configured Slack channel via webhook.",
        parameters: {
          text: { type: "string", description: "The message text to send to Slack" },
        },
        required: ["text"],
      },
    ],
  },
  sendgrid: {
    displayName: "SendGrid",
    description: "Send transactional emails (confirmations, reminders, etc.)",
    actions: [
      {
        name: "send_email",
        description: "Send an email via SendGrid.",
        parameters: {
          to_email: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (plain text)" },
        },
        required: ["to_email", "subject", "body"],
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
//  TOOL EXECUTION — mirrors individual tool executors
// ═══════════════════════════════════════════════════════════

async function executeTool(provider, action, params, credentials) {
  try {
    // ─── Calendly ───
    if (provider === "calendly") {
      const token = credentials.api_token;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      if (action === "list_event_types") {
        const userRes = await fetch("https://api.calendly.com/users/me", { headers });
        if (!userRes.ok) return { success: false, message: "Failed to authenticate with Calendly." };
        const userData = await userRes.json();
        const userUri = userData.resource.uri;

        const res = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`, { headers });
        if (!res.ok) return { success: false, message: "Failed to fetch event types." };
        const data = await res.json();

        const eventTypes = data.collection.map((et) => ({
          uri: et.uri, name: et.name, duration: et.duration, scheduling_url: et.scheduling_url,
        }));
        return {
          success: true,
          data: { event_types: eventTypes },
          message: `Found ${eventTypes.length} event type(s): ${eventTypes.map((e) => `"${e.name}"`).join(", ")}`,
        };
      }

      if (action === "create_scheduling_link") {
        const res = await fetch("https://api.calendly.com/scheduling_links", {
          method: "POST", headers,
          body: JSON.stringify({ max_event_count: 1, owner: params.event_type_uri, owner_type: "EventType" }),
        });
        if (!res.ok) return { success: false, message: "Failed to create scheduling link." };
        const data = await res.json();
        return { success: true, data: { booking_url: data.resource.booking_url }, message: `Here's your booking link: ${data.resource.booking_url}` };
      }
    }

    // ─── Shopify ───
    if (provider === "shopify") {
      const storeUrl = credentials.store_url?.replace(/\/$/, "");
      const shopHeaders = { "X-Shopify-Access-Token": credentials.access_token, "Content-Type": "application/json" };

      if (action === "search_products") {
        const res = await fetch(`${storeUrl}/admin/api/2024-01/products.json?title=${encodeURIComponent(params.query)}&limit=5`, { headers: shopHeaders });
        if (!res.ok) return { success: false, message: "Failed to search Shopify products." };
        const data = await res.json();
        return { success: true, data: { products: data.products }, message: `Found ${data.products.length} product(s)` };
      }

      if (action === "lookup_order") {
        const num = String(params.order_number).replace("#", "");
        const res = await fetch(`${storeUrl}/admin/api/2024-01/orders.json?name=${encodeURIComponent(num)}&status=any&limit=1`, { headers: shopHeaders });
        if (!res.ok) return { success: false, message: "Failed to look up order." };
        const data = await res.json();
        if (!data.orders?.length) return { success: false, message: `No order found with number ${num}` };
        const o = data.orders[0];
        return { success: true, data: { order: o }, message: `Order #${o.name}: ${o.financial_status}, total: ${o.total_price} ${o.currency}` };
      }
    }

    // ─── Stripe ───
    if (provider === "stripe") {
      const sk = credentials.secret_key;
      const stripeHeaders = { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" };

      if (action === "create_payment_link") {
        const amountCents = Math.round(Number(params.amount) * 100);
        // Create a price first
        const priceRes = await fetch("https://api.stripe.com/v1/prices", {
          method: "POST", headers: stripeHeaders,
          body: new URLSearchParams({ unit_amount: String(amountCents), currency: params.currency || "usd", "product_data[name]": params.description || "Payment" }),
        });
        if (!priceRes.ok) return { success: false, message: "Failed to create Stripe price." };
        const priceData = await priceRes.json();
        // Create payment link
        const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
          method: "POST", headers: stripeHeaders,
          body: new URLSearchParams({ "line_items[0][price]": priceData.id, "line_items[0][quantity]": "1" }),
        });
        if (!linkRes.ok) return { success: false, message: "Failed to create payment link." };
        const linkData = await linkRes.json();
        return { success: true, data: { url: linkData.url }, message: `Payment link created: ${linkData.url}` };
      }

      if (action === "lookup_charge") {
        const res = await fetch(`https://api.stripe.com/v1/charges/${params.charge_id}`, { headers: { Authorization: `Bearer ${sk}` } });
        if (!res.ok) return { success: false, message: "Charge not found." };
        const data = await res.json();
        return { success: true, data: { charge: data }, message: `Charge ${data.id}: ${data.status}, $${(data.amount / 100).toFixed(2)} ${data.currency}` };
      }
    }

    // ─── HubSpot ───
    if (provider === "hubspot") {
      const hubHeaders = { Authorization: `Bearer ${credentials.access_token}`, "Content-Type": "application/json" };

      if (action === "create_contact") {
        const properties = { email: params.email };
        if (params.firstname) properties.firstname = params.firstname;
        if (params.lastname) properties.lastname = params.lastname;
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST", headers: hubHeaders, body: JSON.stringify({ properties }),
        });
        if (!res.ok) return { success: false, message: "Failed to create HubSpot contact." };
        const data = await res.json();
        return { success: true, data: { contact_id: data.id }, message: `Contact created: ${params.email} (ID: ${data.id})` };
      }

      if (action === "search_contacts") {
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
          method: "POST", headers: hubHeaders,
          body: JSON.stringify({
            query: params.query,
            limit: 5,
            properties: ["email", "firstname", "lastname"],
          }),
        });
        if (!res.ok) return { success: false, message: "Failed to search contacts." };
        const data = await res.json();
        return { success: true, data: { contacts: data.results }, message: `Found ${data.total} contact(s)` };
      }
    }

    // ─── Slack ───
    if (provider === "slack") {
      if (action === "send_message") {
        const res = await fetch(credentials.webhook_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: params.text }),
        });
        return res.ok
          ? { success: true, message: "Message sent to Slack successfully." }
          : { success: false, message: "Failed to send Slack message." };
      }
    }

    // ─── SendGrid ───
    if (provider === "sendgrid") {
      if (action === "send_email") {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${credentials.api_key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: params.to_email }] }],
            from: { email: credentials.from_email || "noreply@agenly.online", name: credentials.from_name || "Agenly" },
            subject: params.subject,
            content: [{ type: "text/plain", value: params.body }],
          }),
        });
        return (res.status === 202 || res.ok)
          ? { success: true, message: `Email sent to ${params.to_email}` }
          : { success: false, message: "Failed to send email via SendGrid." };
      }
    }

    return { success: false, message: `Unknown action: ${provider}.${action}` };
  } catch (e) {
    console.error(`[IG Tool] Error executing ${provider}.${action}:`, e);
    return { success: false, message: `Tool error: ${e.message || "Unknown error"}` };
  }
}

// ═══════════════════════════════════════════════════════════
//  BUILD GEMINI FUNCTION DECLARATIONS
// ═══════════════════════════════════════════════════════════

function buildFunctionDeclarations(activeProviders) {
  const declarations = [];
  for (const providerKey of activeProviders) {
    const tool = TOOL_CATALOG[providerKey];
    if (!tool) continue;
    for (const action of tool.actions) {
      const properties = {};
      for (const [key, param] of Object.entries(action.parameters)) {
        properties[key] = { type: param.type === "object" ? "string" : param.type, description: param.description };
        if (param.enum) properties[key].enum = param.enum;
      }
      declarations.push({
        name: `${providerKey}_${action.name}`,
        description: `[${tool.displayName}] ${action.description}`,
        parameters: { type: "object", properties, required: action.required },
      });
    }
  }
  return declarations;
}

function buildToolContextPrompt(activeProviders) {
  if (activeProviders.length === 0) return "";
  const lines = ["\n\nYou have access to the following tools/integrations that you can use to help the user:"];
  for (const key of activeProviders) {
    const tool = TOOL_CATALOG[key];
    if (!tool) continue;
    lines.push(`\n- **${tool.displayName}**: ${tool.description}`);
    for (const a of tool.actions) lines.push(`  - ${a.name}: ${a.description}`);
  }
  lines.push("\nWhen a user asks you to perform an action that matches one of these tools, use the appropriate function. Always confirm the action with the user before executing if it involves sending emails, creating records, or making payments.");
  return lines.join("");
}

function parseFunctionName(functionName) {
  if (functionName.startsWith("google_calendar_")) return { provider: "google_calendar", action: functionName.replace("google_calendar_", "") };
  if (functionName.startsWith("google_sheets_")) return { provider: "google_sheets", action: functionName.replace("google_sheets_", "") };
  const parts = functionName.split("_");
  return { provider: parts[0], action: parts.slice(1).join("_") };
}

// ═══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════

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
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);

    // Instagram webhook format
    if (body.object !== "instagram") {
      console.log(`[IG Function] Not an Instagram event: ${body.object}`);
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const entry = body?.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging || !messaging.message) {
      console.log("[IG Function] No message in payload — echo/read event, acknowledging");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // Skip echo messages (messages sent by us)
    if (messaging.message.is_echo) {
      console.log("[IG Function] Echo message, skipping");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id; // our IG user ID
    const messageText = messaging.message.text;

    if (!messageText) {
      console.log("[IG Function] Non-text message (attachment/media), skipping");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200, headers: { "Content-Type": "application/json" },
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
        status: 200, headers: { "Content-Type": "application/json" },
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

    // ─── Fetch Active Tool Integrations ───
    let activeProviders = [];
    let credentialsMap = {};
    let configMap = {};

    try {
      const { data: integrations } = await supabase
        .from("agent_integrations")
        .select("*")
        .eq("agent_id", agent.id)
        .eq("is_active", true);

      for (const row of integrations || []) {
        try {
          const decrypted = decryptCredentials(row.credentials);
          activeProviders.push(row.provider);
          credentialsMap[row.provider] = decrypted;
          configMap[row.provider] = row.config || {};
        } catch (e) {
          console.error(`[IG Function] Failed to decrypt ${row.provider} credentials:`, e);
        }
      }

      if (activeProviders.length > 0) {
        console.log(`[IG Function] Active integrations: ${activeProviders.join(", ")}`);
      }
    } catch (e) {
      console.error("[IG Function] Failed to load integrations:", e);
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

    // ─── Build System Prompt (now with tool context) ───
    const model = agent.chat_model || "gemini-2.0-flash";
    const basePrompt = agent.system_prompt || "You are a helpful AI assistant.";
    const toolContextPrompt = buildToolContextPrompt(activeProviders);

    const systemPrompt = `${basePrompt}${contextText}${toolContextPrompt}

Instructions:
- Answer based on the provided knowledge when available.
- If you don't know the answer, say so honestly.
- Be helpful, concise, and professional.
- When using tools, relay the results naturally to the user.
- For actions that affect external systems (creating contacts, sending emails, booking meetings), confirm with the user or clearly describe what you did.
- This is an Instagram DM conversation, so keep responses clear and well-structured.`;

    // ─── Build Gemini Request (with tools if available) ───
    const functionDeclarations = buildFunctionDeclarations(activeProviders);

    const geminiBody = {
      contents: [
        ...history,
        { role: "user", parts: [{ text: messageText }] },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    // Add tool declarations if there are active integrations
    if (functionDeclarations.length > 0) {
      geminiBody.tools = [{ function_declarations: functionDeclarations }];
    }

    console.log(`[IG Function] Calling Gemini ${model} with ${functionDeclarations.length} tool(s)...`);

    let geminiRes = await fetch(
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

    let geminiData = await geminiRes.json();
    let aiResponse = "";
    const toolsUsed = [];
    const MAX_TOOL_CALLS = 5;
    let toolCallCount = 0;

    // ─── Function Calling Loop ───
    while (toolCallCount < MAX_TOOL_CALLS) {
      const candidate = geminiData.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check if there's a function call
      const functionCallPart = parts.find((p) => p.functionCall);

      if (!functionCallPart) {
        // No function call — extract text response
        aiResponse = parts.map((p) => p.text).filter(Boolean).join("") || "Sorry, I could not generate a response.";
        break;
      }

      // Execute the function call
      const fc = functionCallPart.functionCall;
      console.log(`[IG Function] Tool call: ${fc.name}`, JSON.stringify(fc.args));

      const { provider, action } = parseFunctionName(fc.name);
      const creds = credentialsMap[provider] || {};
      const result = await executeTool(provider, action, fc.args || {}, creds);

      toolsUsed.push(`${provider}.${action}`);
      console.log(`[IG Function] Tool result (${provider}.${action}):`, result.success ? "SUCCESS" : "FAILED", result.message);

      // Feed result back to Gemini for next response
      // IMPORTANT: Pass the model's original parts (includes thought_signature
      // required by gemini-3.x models) instead of manually reconstructing them.
      const followUpBody = {
        contents: [
          ...history,
          { role: "user", parts: [{ text: messageText }] },
          { role: "model", parts },
          {
            role: "function",
            parts: [{
              functionResponse: {
                name: fc.name,
                response: { success: result.success, message: result.message, data: result.data || {} },
              },
            }],
          },
        ],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      };

      if (functionDeclarations.length > 0) {
        followUpBody.tools = [{ function_declarations: functionDeclarations }];
      }

      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(followUpBody),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error(`[IG Function] Gemini follow-up error:`, errText);
        aiResponse = result.message; // Fall back to tool result message
        break;
      }

      geminiData = await geminiRes.json();
      toolCallCount++;
    }

    if (toolCallCount >= MAX_TOOL_CALLS) {
      console.warn("[IG Function] Max tool call limit reached");
    }

    console.log(`[IG Function] AI response (${aiResponse.length} chars): "${aiResponse.slice(0, 100)}..."`);
    if (toolsUsed.length > 0) {
      console.log(`[IG Function] Tools used: ${toolsUsed.join(", ")}`);
    }

    // Save messages
    await supabase.from("messages").insert([
      { conversation_id: conversationId, role: "user", content: messageText },
      { conversation_id: conversationId, role: "assistant", content: aiResponse },
    ]);

    // ─── Send Reply (split long messages) ───
    const MAX_IG_MSG_LEN = 1000;
    const messageChunks = [];

    if (aiResponse.length <= MAX_IG_MSG_LEN) {
      messageChunks.push(aiResponse);
    } else {
      let remaining = aiResponse;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_IG_MSG_LEN) {
          messageChunks.push(remaining);
          break;
        }
        let splitIdx = remaining.lastIndexOf('. ', MAX_IG_MSG_LEN);
        if (splitIdx === -1 || splitIdx < MAX_IG_MSG_LEN * 0.3) {
          splitIdx = remaining.lastIndexOf(' ', MAX_IG_MSG_LEN);
        }
        if (splitIdx === -1) {
          splitIdx = MAX_IG_MSG_LEN;
        } else {
          splitIdx += 1;
        }
        messageChunks.push(remaining.slice(0, splitIdx).trim());
        remaining = remaining.slice(splitIdx).trim();
      }
    }

    console.log(`[IG Function] Sending ${messageChunks.length} message(s)`);

    for (const chunk of messageChunks) {
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
            message: { text: chunk },
          }),
        }
      );

      if (!sendRes.ok) {
        const err = await sendRes.text();
        console.error(`[IG Function] Send failed: ${sendRes.status}`, err);
        throw new Error(`Instagram send failed: ${sendRes.status}`);
      }
    }

    console.log(`[IG Function] ✅ Reply sent to ${senderId}${toolsUsed.length > 0 ? ` (tools: ${toolsUsed.join(", ")})` : ""}`);

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
