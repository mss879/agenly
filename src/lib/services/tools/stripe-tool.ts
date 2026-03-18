import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "create_payment_link",
    description: "Create a Stripe payment link that can be shared with a customer to collect payment.",
    parameters: {
      product_name: { type: "string", description: "Name of the product or service" },
      amount: { type: "number", description: "Amount to charge in the smallest currency unit (e.g. cents). Example: 2500 for $25.00" },
      currency: { type: "string", description: "Three-letter currency code (e.g. 'usd', 'eur', 'gbp'). Defaults to 'usd'." },
    },
    required: ["product_name", "amount"],
  },
  {
    name: "list_recent_payments",
    description: "List recent successful payments/charges.",
    parameters: {
      limit: { type: "number", description: "Number of payments to return. Defaults to 10." },
    },
    required: [],
  },
  {
    name: "lookup_charges_by_email",
    description: "Look up charges associated with a customer email address.",
    parameters: {
      email: { type: "string", description: "Customer email address to search for" },
    },
    required: ["email"],
  },
];

export const stripeTool: ToolExecutor = {
  provider: "stripe",
  displayName: "Stripe",
  description: "Create payment links and manage payments with Stripe",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const secretKey = credentials.secret_key;
    if (!secretKey) return { success: false, message: "Stripe secret key not configured.", error: "Missing secret_key" };

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      if (action === "create_payment_link") {
        const productName = params.product_name as string;
        const amount = params.amount as number;
        const currency = (params.currency as string) || "usd";

        // Step 1: Create a product
        const productRes = await fetch("https://api.stripe.com/v1/products", {
          method: "POST",
          headers,
          body: new URLSearchParams({ name: productName }).toString(),
        });
        if (!productRes.ok) return { success: false, message: "Failed to create Stripe product.", error: `Status ${productRes.status}` };
        const product = await productRes.json();

        // Step 2: Create a price for the product
        const priceRes = await fetch("https://api.stripe.com/v1/prices", {
          method: "POST",
          headers,
          body: new URLSearchParams({
            unit_amount: amount.toString(),
            currency,
            product: product.id,
          }).toString(),
        });
        if (!priceRes.ok) return { success: false, message: "Failed to create Stripe price.", error: `Status ${priceRes.status}` };
        const price = await priceRes.json();

        // Step 3: Create a payment link
        const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
          method: "POST",
          headers,
          body: new URLSearchParams({
            "line_items[0][price]": price.id,
            "line_items[0][quantity]": "1",
          }).toString(),
        });
        if (!linkRes.ok) return { success: false, message: "Failed to create Stripe payment link.", error: `Status ${linkRes.status}` };
        const link = await linkRes.json();

        const displayAmount = (amount / 100).toFixed(2);
        return {
          success: true,
          data: { payment_link_url: link.url, payment_link_id: link.id },
          message: `Payment link created for "${productName}" ($${displayAmount} ${currency.toUpperCase()}): ${link.url}`,
        };
      }

      if (action === "list_recent_payments") {
        const limit = (params.limit as number) || 10;
        const res = await fetch(`https://api.stripe.com/v1/charges?limit=${limit}`, { headers });
        if (!res.ok) return { success: false, message: "Failed to list payments.", error: `Status ${res.status}` };
        const data = await res.json();

        const charges = (data.data || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          amount: ((c.amount as number) / 100).toFixed(2),
          currency: (c.currency as string)?.toUpperCase(),
          status: c.status,
          description: c.description,
          email: (c.billing_details as Record<string, string>)?.email,
          created: new Date((c.created as number) * 1000).toISOString(),
        }));

        return {
          success: true,
          data: { charges },
          message: charges.length > 0
            ? `Found ${charges.length} recent charge(s): ${charges.map((c: Record<string, string>) => `$${c.amount} ${c.currency} (${c.status})${c.email ? ` — ${c.email}` : ""}`).join(", ")}`
            : "No recent charges found.",
        };
      }

      if (action === "lookup_charges_by_email") {
        const email = params.email as string;
        // Search for customers by email first
        const custRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`, { headers });
        if (!custRes.ok) return { success: false, message: "Failed to search customers.", error: `Status ${custRes.status}` };
        const custData = await custRes.json();

        if (!custData.data?.length) {
          return { success: true, data: { charges: [] }, message: `No customer found with email "${email}".` };
        }

        const customerId = custData.data[0].id;
        const chargeRes = await fetch(`https://api.stripe.com/v1/charges?customer=${customerId}&limit=10`, { headers });
        if (!chargeRes.ok) return { success: false, message: "Failed to look up charges.", error: `Status ${chargeRes.status}` };
        const chargeData = await chargeRes.json();

        const charges = (chargeData.data || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          amount: ((c.amount as number) / 100).toFixed(2),
          currency: (c.currency as string)?.toUpperCase(),
          status: c.status,
          description: c.description,
          created: new Date((c.created as number) * 1000).toISOString(),
        }));

        return {
          success: true,
          data: { charges, customer_id: customerId },
          message: charges.length > 0
            ? `Found ${charges.length} charge(s) for ${email}: ${charges.map((c: Record<string, string>) => `$${c.amount} ${c.currency} (${c.status})`).join(", ")}`
            : `Customer "${email}" found but has no charges.`,
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Stripe.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
