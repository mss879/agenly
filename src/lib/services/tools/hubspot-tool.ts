import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "create_contact",
    description: "Create a new contact in HubSpot CRM.",
    parameters: {
      email: { type: "string", description: "Contact email address (required)" },
      firstname: { type: "string", description: "Contact first name" },
      lastname: { type: "string", description: "Contact last name" },
      phone: { type: "string", description: "Contact phone number" },
      company: { type: "string", description: "Contact company name" },
    },
    required: ["email"],
  },
  {
    name: "search_contacts",
    description: "Search for contacts in HubSpot CRM by email, name, or company.",
    parameters: {
      query: { type: "string", description: "Search query (email, name, or company)" },
    },
    required: ["query"],
  },
  {
    name: "create_deal",
    description: "Create a new deal in the HubSpot CRM sales pipeline.",
    parameters: {
      dealname: { type: "string", description: "Name/title of the deal" },
      amount: { type: "string", description: "Deal amount in dollars" },
      pipeline: { type: "string", description: "Pipeline ID. Defaults to 'default'." },
      dealstage: { type: "string", description: "Deal stage ID. Defaults to first stage." },
    },
    required: ["dealname"],
  },
  {
    name: "add_note",
    description: "Add a note to a contact in HubSpot CRM.",
    parameters: {
      contact_id: { type: "string", description: "The HubSpot contact ID to add the note to" },
      note_body: { type: "string", description: "The content of the note" },
    },
    required: ["contact_id", "note_body"],
  },
];

export const hubspotTool: ToolExecutor = {
  provider: "hubspot",
  displayName: "HubSpot",
  description: "Manage contacts and deals in HubSpot CRM",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const token = credentials.access_token;
    if (!token) return { success: false, message: "HubSpot access token not configured.", error: "Missing access_token" };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      if (action === "create_contact") {
        const properties: Record<string, string> = { email: params.email as string };
        if (params.firstname) properties.firstname = params.firstname as string;
        if (params.lastname) properties.lastname = params.lastname as string;
        if (params.phone) properties.phone = params.phone as string;
        if (params.company) properties.company = params.company as string;

        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST",
          headers,
          body: JSON.stringify({ properties }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 409) return { success: false, message: `A contact with email "${params.email}" already exists in HubSpot.`, error: "Conflict" };
          return { success: false, message: "Failed to create HubSpot contact.", error: err.message || `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { contact_id: data.id, properties: data.properties },
          message: `Contact created successfully! Name: ${data.properties.firstname || ""} ${data.properties.lastname || ""}, Email: ${data.properties.email}, HubSpot ID: ${data.id}`,
        };
      }

      if (action === "search_contacts") {
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: params.query as string,
            limit: 10,
            properties: ["email", "firstname", "lastname", "phone", "company"],
          }),
        });

        if (!res.ok) return { success: false, message: "Failed to search HubSpot contacts.", error: `Status ${res.status}` };
        const data = await res.json();

        const contacts = (data.results || []).map((c: Record<string, Record<string, string>>) => ({
          id: c.id,
          email: c.properties?.email,
          firstname: c.properties?.firstname,
          lastname: c.properties?.lastname,
          phone: c.properties?.phone,
          company: c.properties?.company,
        }));

        return {
          success: true,
          data: { contacts, total: data.total },
          message: contacts.length > 0
            ? `Found ${data.total} contact(s). Top results: ${contacts.map((c: Record<string, string>) => `${c.firstname || ""} ${c.lastname || ""} (${c.email})`).join(", ")}`
            : `No contacts found for "${params.query}".`,
        };
      }

      if (action === "create_deal") {
        const properties: Record<string, string> = { dealname: params.dealname as string };
        if (params.amount) properties.amount = params.amount as string;
        if (params.pipeline) properties.pipeline = params.pipeline as string;
        if (params.dealstage) properties.dealstage = params.dealstage as string;

        const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
          method: "POST",
          headers,
          body: JSON.stringify({ properties }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to create HubSpot deal.", error: err.message || `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { deal_id: data.id, properties: data.properties },
          message: `Deal "${data.properties.dealname}" created successfully with ID: ${data.id}${params.amount ? ` (Amount: $${params.amount})` : ""}`,
        };
      }

      if (action === "add_note") {
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
          method: "POST",
          headers,
          body: JSON.stringify({
            properties: {
              hs_note_body: params.note_body as string,
              hs_timestamp: new Date().toISOString(),
            },
            associations: [{
              to: { id: params.contact_id as string },
              types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
            }],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: "Failed to add note to contact.", error: err.message || `Status ${res.status}` };
        }

        return { success: true, message: `Note added successfully to contact ${params.contact_id}.` };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to HubSpot.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
