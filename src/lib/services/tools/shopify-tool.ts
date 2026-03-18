import type { ToolExecutor, ToolAction, ToolResult } from "./types";

const ACTIONS: ToolAction[] = [
  {
    name: "lookup_order",
    description: "Look up a Shopify order by order number or order name (e.g. #1001).",
    parameters: {
      order_query: { type: "string", description: "Order number, order name (e.g. '#1001'), or customer email to search" },
    },
    required: ["order_query"],
  },
  {
    name: "search_products",
    description: "Search for products in the Shopify store.",
    parameters: {
      query: { type: "string", description: "Product title or keyword to search for" },
    },
    required: ["query"],
  },
  {
    name: "get_order_tracking",
    description: "Get tracking/fulfillment information for a specific order.",
    parameters: {
      order_id: { type: "string", description: "The Shopify order ID" },
    },
    required: ["order_id"],
  },
];

export const shopifyTool: ToolExecutor = {
  provider: "shopify",
  displayName: "Shopify",
  description: "Look up orders, products, and tracking info from Shopify",
  actions: ACTIONS,

  async execute(action, params, credentials): Promise<ToolResult> {
    const { access_token, store_url } = credentials;
    if (!access_token || !store_url) {
      return { success: false, message: "Shopify credentials incomplete. Need access_token and store_url.", error: "Missing credentials" };
    }

    // Normalize store URL
    const baseUrl = store_url.replace(/\/$/, "");
    const apiUrl = `${baseUrl}/admin/api/2024-01`;
    const headers = {
      "X-Shopify-Access-Token": access_token,
      "Content-Type": "application/json",
    };

    try {
      if (action === "lookup_order") {
        const query = params.order_query as string;

        // Try searching by name (order number)
        let url = `${apiUrl}/orders.json?status=any&limit=5`;
        if (query.includes("@")) {
          // Search by email
          url += `&email=${encodeURIComponent(query)}`;
        } else {
          // Search by order name/number
          const cleaned = query.replace("#", "");
          url += `&name=${encodeURIComponent(cleaned)}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) return { success: false, message: "Failed to look up order.", error: `Status ${res.status}` };
        const data = await res.json();

        if (!data.orders?.length) {
          return { success: true, data: { orders: [] }, message: `No orders found for "${query}".` };
        }

        const orders = data.orders.map((o: Record<string, unknown>) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          total_price: o.total_price,
          currency: o.currency,
          financial_status: o.financial_status,
          fulfillment_status: o.fulfillment_status || "unfulfilled",
          created_at: o.created_at,
        }));

        return {
          success: true,
          data: { orders },
          message: `Found ${orders.length} order(s). ${orders.map((o: Record<string, string>) =>
            `Order ${o.name}: $${o.total_price} ${o.currency} — Payment: ${o.financial_status}, Fulfillment: ${o.fulfillment_status}`
          ).join(". ")}`,
        };
      }

      if (action === "search_products") {
        const query = params.query as string;
        const res = await fetch(`${apiUrl}/products.json?title=${encodeURIComponent(query)}&limit=10`, { headers });
        if (!res.ok) return { success: false, message: "Failed to search products.", error: `Status ${res.status}` };
        const data = await res.json();

        const products = (data.products || []).map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          vendor: p.vendor,
          product_type: p.product_type,
          variants_count: Array.isArray(p.variants) ? p.variants.length : 0,
          price: Array.isArray(p.variants) && p.variants.length > 0 ? (p.variants[0] as Record<string, string>).price : null,
        }));

        return {
          success: true,
          data: { products },
          message: products.length > 0
            ? `Found ${products.length} product(s): ${products.map((p: Record<string, string>) => `"${p.title}" ($${p.price || "N/A"})`).join(", ")}`
            : `No products found matching "${query}".`,
        };
      }

      if (action === "get_order_tracking") {
        const orderId = params.order_id as string;
        const res = await fetch(`${apiUrl}/orders/${orderId}/fulfillments.json`, { headers });
        if (!res.ok) return { success: false, message: "Failed to get tracking info.", error: `Status ${res.status}` };
        const data = await res.json();

        const fulfillments = (data.fulfillments || []).map((f: Record<string, unknown>) => ({
          id: f.id,
          status: f.status,
          tracking_company: f.tracking_company,
          tracking_number: f.tracking_number,
          tracking_url: f.tracking_url,
          created_at: f.created_at,
        }));

        return {
          success: true,
          data: { fulfillments },
          message: fulfillments.length > 0
            ? `Order has ${fulfillments.length} fulfillment(s). ${fulfillments.map((f: Record<string, string>) =>
                `Status: ${f.status}, Carrier: ${f.tracking_company || "N/A"}, Tracking: ${f.tracking_number || "N/A"}${f.tracking_url ? ` (${f.tracking_url})` : ""}`
              ).join(". ")}`
            : "No fulfillments found for this order. It may not have shipped yet.",
        };
      }

      return { success: false, message: `Unknown action: ${action}`, error: "Invalid action" };
    } catch (e) {
      return { success: false, message: "Failed to connect to Shopify.", error: e instanceof Error ? e.message : "Unknown error" };
    }
  },
};
