import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
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
      event_type_uri: {
        type: "string",
        description: "The URI of the event type to create a scheduling link for. Get this from list_event_types first.",
      },
    },
    required: ["event_type_uri"],
  },
];

export const calendlyTool: ToolExecutor = {
  provider: "calendly",
  displayName: "Calendly",
  description: "Schedule meetings by generating Calendly booking links",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const token = credentials.api_token;
    if (!token) return { success: false, message: "Calendly API token not configured", error: "Missing api_token" };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      if (action === "list_event_types") {
        // First get the current user URI
        const userRes = await fetch("https://api.calendly.com/users/me", { headers });
        if (!userRes.ok) return { success: false, message: "Failed to authenticate with Calendly. Please check your API token.", error: `Calendly API error: ${userRes.status}` };
        const userData = await userRes.json();
        const userUri = userData.resource.uri;

        const res = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`, { headers });
        if (!res.ok) return { success: false, message: "Failed to fetch event types from Calendly.", error: `Status ${res.status}` };
        const data = await res.json();

        const eventTypes = data.collection.map((et: Record<string, unknown>) => ({
          uri: et.uri,
          name: et.name,
          duration: et.duration,
          scheduling_url: et.scheduling_url,
        }));

        return {
          success: true,
          data: { event_types: eventTypes },
          message: `Found ${eventTypes.length} event type(s): ${eventTypes.map((e: Record<string, string>) => `"${e.name}"`).join(", ")}`,
        };
      }

      if (action === "create_scheduling_link") {
        const eventTypeUri = params.event_type_uri as string;
        if (!eventTypeUri) return { success: false, message: "Event type URI is required.", error: "Missing event_type_uri" };

        const res = await fetch("https://api.calendly.com/scheduling_links", {
          method: "POST",
          headers,
          body: JSON.stringify({
            max_event_count: 1,
            owner: eventTypeUri,
            owner_type: "EventType",
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to create scheduling link.", error: err.message || `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { booking_url: data.resource.booking_url },
          message: `Here's your booking link: ${data.resource.booking_url}`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Calendly.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
