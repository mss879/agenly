import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "list_events",
    description: "List upcoming events from Google Calendar.",
    parameters: {
      max_results: { type: "number", description: "Maximum number of events to return. Defaults to 10." },
    },
    required: [],
  },
  {
    name: "create_event",
    description: "Create a new event on Google Calendar.",
    parameters: {
      summary: { type: "string", description: "Event title" },
      description: { type: "string", description: "Event description" },
      start_time: { type: "string", description: "Event start time in ISO 8601 format (e.g. 2025-12-25T10:00:00Z)" },
      end_time: { type: "string", description: "Event end time in ISO 8601 format" },
      attendees: { type: "string", description: "Comma-separated email addresses of attendees" },
    },
    required: ["summary", "start_time", "end_time"],
  },
  {
    name: "check_availability",
    description: "Check free/busy status for a given time range.",
    parameters: {
      start_time: { type: "string", description: "Start of time range in ISO 8601 format" },
      end_time: { type: "string", description: "End of time range in ISO 8601 format" },
    },
    required: ["start_time", "end_time"],
  },
];

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT header and claim set
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claimSet = Buffer.from(JSON.stringify({
    iss: key.client_email,
    sub: key.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  // Sign with private key
  const crypto = await import("crypto");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  const signature = signer.sign(key.private_key, "base64url");

  const jwt = `${header}.${claimSet}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error("Failed to get Google access token");
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export const googleCalendarTool: ToolExecutor = {
  provider: "google_calendar",
  displayName: "Google Calendar",
  description: "Manage Google Calendar events and check availability",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const serviceKey = credentials.service_account_key;
    if (!serviceKey) return { success: false, message: "Google Calendar service account key not configured.", error: "Missing service_account_key" };

    try {
      const accessToken = await getAccessToken(serviceKey);
      const calendarId = credentials.calendar_id || "primary";
      const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (action === "list_events") {
        const maxResults = (params.max_results as number) || 10;
        const now = new Date().toISOString();
        const res = await fetch(`${baseUrl}/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`, { headers });
        if (!res.ok) return { success: false, message: "Failed to fetch calendar events.", error: `Status ${res.status}` };
        const data = await res.json();

        const events = (data.items || []).map((e: Record<string, Record<string, string>>) => ({
          id: e.id,
          summary: e.summary,
          start: (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date,
          end: (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date,
        }));

        return {
          success: true,
          data: { events },
          message: events.length > 0
            ? `Found ${events.length} upcoming event(s): ${events.map((e: Record<string, string>) => `"${e.summary}" at ${e.start}`).join(", ")}`
            : "No upcoming events found.",
        };
      }

      if (action === "create_event") {
        const body: Record<string, unknown> = {
          summary: params.summary as string,
          description: params.description as string || "",
          start: { dateTime: params.start_time as string },
          end: { dateTime: params.end_time as string },
        };

        if (params.attendees) {
          body.attendees = (params.attendees as string).split(",").map((e: string) => ({ email: e.trim() }));
        }

        const res = await fetch(`${baseUrl}/events`, { method: "POST", headers, body: JSON.stringify(body) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to create calendar event.", error: err.error?.message || `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { event_id: data.id, html_link: data.htmlLink },
          message: `Event "${data.summary}" created successfully! Link: ${data.htmlLink}`,
        };
      }

      if (action === "check_availability") {
        const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
          method: "POST",
          headers,
          body: JSON.stringify({
            timeMin: params.start_time as string,
            timeMax: params.end_time as string,
            items: [{ id: calendarId }],
          }),
        });

        if (!res.ok) return { success: false, message: "Failed to check availability.", error: `Status ${res.status}` };
        const data = await res.json();
        const busy = data.calendars?.[calendarId]?.busy || [];

        return {
          success: true,
          data: { busy_periods: busy },
          message: busy.length > 0
            ? `There are ${busy.length} busy period(s) in the selected time range.`
            : "The time range is completely free!",
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Google Calendar.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
