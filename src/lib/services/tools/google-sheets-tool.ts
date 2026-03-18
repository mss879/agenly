import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "read_rows",
    description: "Read rows from a Google Sheets spreadsheet.",
    parameters: {
      spreadsheet_id: { type: "string", description: "The Google Sheets spreadsheet ID (from the URL)" },
      range: { type: "string", description: "The range to read in A1 notation (e.g. 'Sheet1!A1:D10' or 'Sheet1')" },
    },
    required: ["spreadsheet_id", "range"],
  },
  {
    name: "append_row",
    description: "Append a new row of data to a Google Sheets spreadsheet.",
    parameters: {
      spreadsheet_id: { type: "string", description: "The Google Sheets spreadsheet ID" },
      range: { type: "string", description: "The sheet/range to append to (e.g. 'Sheet1')" },
      values: { type: "string", description: "Comma-separated values for the new row. Example: 'John,Doe,john@example.com,2025-01-01'" },
    },
    required: ["spreadsheet_id", "range", "values"],
  },
  {
    name: "search_value",
    description: "Search for a specific value across a Google Sheets spreadsheet.",
    parameters: {
      spreadsheet_id: { type: "string", description: "The Google Sheets spreadsheet ID" },
      range: { type: "string", description: "The range to search in (e.g. 'Sheet1')" },
      search_term: { type: "string", description: "The value to search for" },
    },
    required: ["spreadsheet_id", "range", "search_term"],
  },
];

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claimSet = Buffer.from(JSON.stringify({
    iss: key.client_email,
    sub: key.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  const crypto = await import("crypto");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  const signature = signer.sign(key.private_key, "base64url");

  const jwt = `${header}.${claimSet}.${signature}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error("Failed to get Google access token");
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export const googleSheetsTool: ToolExecutor = {
  provider: "google_sheets",
  displayName: "Google Sheets",
  description: "Read, write, and search data in Google Sheets spreadsheets",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const serviceKey = credentials.service_account_key;
    if (!serviceKey) return { success: false, message: "Google Sheets service account key not configured.", error: "Missing service_account_key" };

    try {
      const accessToken = await getAccessToken(serviceKey);
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (action === "read_rows") {
        const spreadsheetId = params.spreadsheet_id as string;
        const range = params.range as string;

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
          { headers }
        );

        if (!res.ok) return { success: false, message: "Failed to read spreadsheet.", error: `Status ${res.status}` };
        const data = await res.json();
        const rows = data.values || [];

        return {
          success: true,
          data: { rows, range: data.range, row_count: rows.length },
          message: rows.length > 0
            ? `Read ${rows.length} row(s) from ${data.range}. Headers: ${rows[0]?.join(", ")}. Data rows: ${rows.length - 1}`
            : "The specified range is empty.",
        };
      }

      if (action === "append_row") {
        const spreadsheetId = params.spreadsheet_id as string;
        const range = params.range as string;
        const valuesStr = params.values as string;
        const values = valuesStr.split(",").map((v: string) => v.trim());

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ values: [values] }),
          }
        );

        if (!res.ok) return { success: false, message: "Failed to append row.", error: `Status ${res.status}` };
        const data = await res.json();

        return {
          success: true,
          data: { updated_range: data.updates?.updatedRange },
          message: `Row appended successfully to ${data.updates?.updatedRange || range}. Values: ${values.join(", ")}`,
        };
      }

      if (action === "search_value") {
        const spreadsheetId = params.spreadsheet_id as string;
        const range = params.range as string;
        const searchTerm = (params.search_term as string).toLowerCase();

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
          { headers }
        );

        if (!res.ok) return { success: false, message: "Failed to read spreadsheet for search.", error: `Status ${res.status}` };
        const data = await res.json();
        const rows = data.values || [];

        const matches: { row: number; data: string[] }[] = [];
        rows.forEach((row: string[], index: number) => {
          if (row.some((cell: string) => cell.toString().toLowerCase().includes(searchTerm))) {
            matches.push({ row: index + 1, data: row });
          }
        });

        return {
          success: true,
          data: { matches, total_matches: matches.length },
          message: matches.length > 0
            ? `Found "${params.search_term}" in ${matches.length} row(s). First match at row ${matches[0].row}: ${matches[0].data.join(", ")}`
            : `No matches found for "${params.search_term}".`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Google Sheets.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
