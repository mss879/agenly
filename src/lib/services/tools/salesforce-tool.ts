import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "create_lead",
    description: "Create a new lead in Salesforce.",
    parameters: {
      FirstName: { type: "string", description: "Lead first name" },
      LastName: { type: "string", description: "Lead last name (required)" },
      Email: { type: "string", description: "Lead email address" },
      Phone: { type: "string", description: "Lead phone number" },
      Company: { type: "string", description: "Lead company name (required)" },
      Title: { type: "string", description: "Lead job title" },
    },
    required: ["LastName", "Company"],
  },
  {
    name: "query_records",
    description: "Query Salesforce records using SOQL. Use this to search for contacts, leads, accounts, opportunities, or any Salesforce object.",
    parameters: {
      soql: { type: "string", description: "SOQL query string. Example: SELECT Id, Name, Email FROM Lead WHERE Email = 'test@example.com'" },
    },
    required: ["soql"],
  },
  {
    name: "update_record",
    description: "Update a Salesforce record by its type and ID.",
    parameters: {
      object_type: { type: "string", description: "Salesforce object type (e.g. Lead, Contact, Account, Opportunity)" },
      record_id: { type: "string", description: "The Salesforce record ID" },
      fields: { type: "object", description: "JSON object of field names and values to update" },
    },
    required: ["object_type", "record_id", "fields"],
  },
];

export const salesforceTool: ToolExecutor = {
  provider: "salesforce",
  displayName: "Salesforce",
  description: "Manage leads, contacts, and records in Salesforce CRM",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const { access_token, instance_url } = credentials;
    if (!access_token || !instance_url) {
      return { success: false, message: "Salesforce credentials incomplete. Need access_token and instance_url.", error: "Missing credentials" };
    }

    const baseUrl = `${instance_url}/services/data/v62.0`;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };

    try {
      if (action === "create_lead") {
        const body: Record<string, string> = {
          LastName: params.LastName as string,
          Company: params.Company as string,
        };
        if (params.FirstName) body.FirstName = params.FirstName as string;
        if (params.Email) body.Email = params.Email as string;
        if (params.Phone) body.Phone = params.Phone as string;
        if (params.Title) body.Title = params.Title as string;

        const res = await fetch(`${baseUrl}/sobjects/Lead`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => [{}]);
          return { success: false, message: "Failed to create Salesforce lead.", error: Array.isArray(err) ? err[0]?.message : `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { lead_id: data.id },
          message: `Lead created successfully! Name: ${params.FirstName || ""} ${params.LastName}, Company: ${params.Company}, Salesforce ID: ${data.id}`,
        };
      }

      if (action === "query_records") {
        const soql = params.soql as string;
        const res = await fetch(`${baseUrl}/query?q=${encodeURIComponent(soql)}`, { headers });

        if (!res.ok) {
          const err = await res.json().catch(() => [{}]);
          return { success: false, message: "SOQL query failed.", error: Array.isArray(err) ? err[0]?.message : `Status ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          data: { records: data.records, totalSize: data.totalSize },
          message: `Query returned ${data.totalSize} record(s).${data.records?.length > 0 ? ` First record: ${JSON.stringify(data.records[0])}` : ""}`,
        };
      }

      if (action === "update_record") {
        const objectType = params.object_type as string;
        const recordId = params.record_id as string;
        const fields = params.fields as Record<string, unknown>;

        const res = await fetch(`${baseUrl}/sobjects/${objectType}/${recordId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(fields),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => [{}]);
          return { success: false, message: "Failed to update record.", error: Array.isArray(err) ? err[0]?.message : `Status ${res.status}` };
        }

        return {
          success: true,
          data: { record_id: recordId },
          message: `${objectType} record ${recordId} updated successfully.`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Salesforce.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
