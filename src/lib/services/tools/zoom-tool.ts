import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "create_meeting",
    description: "Create a new Zoom meeting and return the join URL.",
    parameters: {
      topic: { type: "string", description: "Meeting title/topic" },
      start_time: { type: "string", description: "Meeting start time in ISO 8601 format (e.g. 2025-12-25T10:00:00Z). Leave empty for instant meeting." },
      duration: { type: "number", description: "Meeting duration in minutes. Defaults to 30." },
    },
    required: ["topic"],
  },
  {
    name: "list_meetings",
    description: "List upcoming scheduled Zoom meetings.",
    parameters: {},
    required: [],
  },
];

export const zoomTool: ToolExecutor = {
  provider: "zoom",
  displayName: "Zoom",
  description: "Create and manage Zoom video meetings",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const { account_id, client_id, client_secret } = credentials;
    if (!account_id || !client_id || !client_secret) {
      return { success: false, message: "Zoom credentials incomplete. Need account_id, client_id, and client_secret.", error: "Missing credentials" };
    }

    try {
      // Get OAuth token using Server-to-Server OAuth
      const tokenRes = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=account_credentials&account_id=${account_id}`,
      });

      if (!tokenRes.ok) return { success: false, message: "Failed to authenticate with Zoom. Check your credentials.", error: `Auth failed: ${tokenRes.status}` };
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (action === "create_meeting") {
        const topic = params.topic as string || "Meeting";
        const startTime = params.start_time as string;
        const duration = (params.duration as number) || 30;

        const body: Record<string, unknown> = {
          topic,
          type: startTime ? 2 : 1, // 2 = scheduled, 1 = instant
          duration,
          settings: {
            join_before_host: true,
            waiting_room: false,
          },
        };

        if (startTime) body.start_time = startTime;

        const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to create Zoom meeting.", error: err.message || `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: {
            meeting_id: data.id,
            join_url: data.join_url,
            start_url: data.start_url,
            topic: data.topic,
            start_time: data.start_time,
            duration: data.duration,
            password: data.password,
          },
          message: `Zoom meeting created! Topic: "${data.topic}". Join URL: ${data.join_url}${data.password ? ` (Password: ${data.password})` : ""}`,
        };
      }

      if (action === "list_meetings") {
        const res = await fetch("https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=10", { headers });
        if (!res.ok) return { success: false, message: "Failed to list Zoom meetings.", error: `Status ${res.status}` };
        const data = await res.json();

        const meetings = (data.meetings || []).map((m: Record<string, unknown>) => ({
          id: m.id,
          topic: m.topic,
          start_time: m.start_time,
          duration: m.duration,
          join_url: m.join_url,
        }));

        return {
          success: true,
          data: { meetings },
          message: meetings.length > 0
            ? `Found ${meetings.length} upcoming meeting(s): ${meetings.map((m: Record<string, string>) => `"${m.topic}"`).join(", ")}`
            : "No upcoming meetings found.",
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Zoom.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
