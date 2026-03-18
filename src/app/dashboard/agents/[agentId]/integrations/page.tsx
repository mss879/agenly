"use client";
import { useEffect, useState, use } from "react";
import {
  Plug, Calendar, Video, CalendarDays, Users, Cloud,
  ShoppingBag, CreditCard, Table, Hash, Mail,
  CheckCircle, XCircle, Loader2, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, Zap, Shield,
} from "lucide-react";

// ─── Provider Configs (mirrored from tool-registry, client-safe) ───
const PROVIDERS = [
  // Scheduling
  { provider: "calendly", displayName: "Calendly", description: "Generate booking links so customers can schedule meetings", category: "scheduling", icon: Calendar, color: "from-blue-500 to-blue-600",
    credentialFields: [{ key: "api_token", label: "Personal Access Token", type: "password" as const, placeholder: "eyJra...", helpText: "Get from Calendly → Integrations → API & Webhooks" }], configFields: [] },
  { provider: "zoom", displayName: "Zoom", description: "Create and manage Zoom video meetings", category: "scheduling", icon: Video, color: "from-blue-600 to-indigo-600",
    credentialFields: [
      { key: "account_id", label: "Account ID", type: "text" as const, placeholder: "Your Zoom Account ID", helpText: "" },
      { key: "client_id", label: "Client ID", type: "text" as const, placeholder: "Server-to-Server OAuth Client ID", helpText: "" },
      { key: "client_secret", label: "Client Secret", type: "password" as const, placeholder: "Server-to-Server OAuth Secret", helpText: "" },
    ], configFields: [] },
  { provider: "google_calendar", displayName: "Google Calendar", description: "Manage calendar events and check availability", category: "scheduling", icon: CalendarDays, color: "from-green-500 to-emerald-600",
    credentialFields: [{ key: "service_account_key", label: "Service Account JSON Key", type: "textarea" as const, placeholder: '{"type":"service_account",...}', helpText: "Paste the entire JSON key file contents" }],
    configFields: [{ key: "calendar_id", label: "Calendar ID", type: "text" as const, placeholder: "primary", helpText: "Leave as 'primary' for the default calendar" }] },
  // CRM
  { provider: "hubspot", displayName: "HubSpot", description: "Manage contacts and deals in HubSpot CRM", category: "crm", icon: Users, color: "from-orange-500 to-red-500",
    credentialFields: [{ key: "access_token", label: "Private App Access Token", type: "password" as const, placeholder: "pat-na1-...", helpText: "Create a Private App in HubSpot → Settings → Integrations" }], configFields: [] },
  { provider: "salesforce", displayName: "Salesforce", description: "Manage leads and records in Salesforce CRM", category: "crm", icon: Cloud, color: "from-sky-500 to-blue-600",
    credentialFields: [
      { key: "access_token", label: "Access Token", type: "password" as const, placeholder: "00D...", helpText: "From Salesforce Connected App or Session ID" },
      { key: "instance_url", label: "Instance URL", type: "text" as const, placeholder: "https://yourorg.salesforce.com", helpText: "" },
    ], configFields: [] },
  // E-Commerce
  { provider: "shopify", displayName: "Shopify", description: "Look up orders, products, and tracking from your store", category: "ecommerce", icon: ShoppingBag, color: "from-green-500 to-lime-500",
    credentialFields: [
      { key: "access_token", label: "Admin API Access Token", type: "password" as const, placeholder: "shpat_...", helpText: "From Shopify Admin → Apps → Develop Apps" },
      { key: "store_url", label: "Store URL", type: "text" as const, placeholder: "https://your-store.myshopify.com", helpText: "" },
    ], configFields: [] },
  { provider: "stripe", displayName: "Stripe", description: "Create payment links and look up charges", category: "ecommerce", icon: CreditCard, color: "from-violet-500 to-purple-600",
    credentialFields: [{ key: "secret_key", label: "Secret Key", type: "password" as const, placeholder: "sk_live_...", helpText: "From Stripe Dashboard → Developers → API Keys" }], configFields: [] },
  // Productivity
  { provider: "google_sheets", displayName: "Google Sheets", description: "Read, write, and search spreadsheet data", category: "productivity", icon: Table, color: "from-emerald-500 to-teal-600",
    credentialFields: [{ key: "service_account_key", label: "Service Account JSON Key", type: "textarea" as const, placeholder: '{"type":"service_account",...}', helpText: "Share your spreadsheet with the service account email" }], configFields: [] },
  { provider: "slack", displayName: "Slack", description: "Send notifications and messages to Slack channels", category: "productivity", icon: Hash, color: "from-purple-500 to-pink-500",
    credentialFields: [{ key: "webhook_url", label: "Incoming Webhook URL", type: "password" as const, placeholder: "https://hooks.slack.com/services/T.../B.../...", helpText: "Create at api.slack.com → Your Apps → Incoming Webhooks" }], configFields: [] },
  // Email
  { provider: "sendgrid", displayName: "SendGrid", description: "Send transactional emails (confirmations, reminders, etc.)", category: "email", icon: Mail, color: "from-cyan-500 to-blue-500",
    credentialFields: [
      { key: "api_key", label: "API Key", type: "password" as const, placeholder: "SG.xxx...", helpText: "From SendGrid → Settings → API Keys" },
      { key: "from_email", label: "Sender Email", type: "text" as const, placeholder: "noreply@yourdomain.com", helpText: "Must be a verified sender in SendGrid" },
      { key: "from_name", label: "Sender Name", type: "text" as const, placeholder: "Your Company", helpText: "" },
    ], configFields: [] },
];

const CATEGORIES = [
  { key: "scheduling", label: "Scheduling & Meetings", icon: Calendar, color: "text-blue-400" },
  { key: "crm", label: "CRM & Leads", icon: Users, color: "text-orange-400" },
  { key: "ecommerce", label: "E-Commerce & Payments", icon: ShoppingBag, color: "text-green-400" },
  { key: "productivity", label: "Productivity & Data", icon: Table, color: "text-purple-400" },
  { key: "email", label: "Email & Communication", icon: Mail, color: "text-cyan-400" },
];

interface SavedIntegration {
  id: string;
  provider: string;
  is_active: boolean;
  config: Record<string, unknown>;
  masked_credentials: Record<string, string>;
}

export default function IntegrationsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [integrations, setIntegrations] = useState<SavedIntegration[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchIntegrations(); }, [agentId]);

  async function fetchIntegrations() {
    try {
      const res = await fetch(`/api/agents/${agentId}/integrations`);
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) { console.error("Failed to fetch integrations:", e); }
    finally { setLoading(false); }
  }

  function getIntegration(provider: string) {
    return integrations.find((i) => i.provider === provider);
  }

  function isConnected(provider: string) {
    return !!getIntegration(provider);
  }

  function handleExpand(provider: string) {
    if (expandedProvider === provider) {
      setExpandedProvider(null);
      setCredentials({});
      setConfigValues({});
      setError(null);
    } else {
      setExpandedProvider(provider);
      setCredentials({});
      setConfigValues({});
      setError(null);
      setSuccess(null);
    }
  }

  async function handleSave(provider: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const prov = PROVIDERS.find((p) => p.provider === provider);
      // Validate all required credential fields are filled
      const missingFields = prov?.credentialFields.filter((f) => !credentials[f.key]?.trim());
      if (missingFields && missingFields.length > 0) {
        setError(`Please fill in: ${missingFields.map((f) => f.label).join(", ")}`);
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = { provider, credentials };
      if (Object.keys(configValues).length > 0) body.config = configValues;

      const res = await fetch(`/api/agents/${agentId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save integration");
      } else {
        setSuccess(`${prov?.displayName} connected successfully! ✅`);
        setExpandedProvider(null);
        setCredentials({});
        setConfigValues({});
        fetchIntegrations();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(provider: string) {
    const prov = PROVIDERS.find((p) => p.provider === provider);
    if (!confirm(`Remove ${prov?.displayName} integration? The AI agent will no longer be able to use it.`)) return;

    try {
      const res = await fetch(`/api/agents/${agentId}/integrations?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess(`${prov?.displayName} removed`);
        fetchIntegrations();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e) { console.error("Delete failed:", e); }
  }

  const connectedCount = integrations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Plug size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integrations</h1>
            <p className="text-sm text-surface-400">Connect third-party tools to give your AI agent real-world powers</p>
          </div>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">{connectedCount} Active</span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-violet-500/5 border border-violet-500/10 rounded-xl p-4">
        <Shield size={18} className="text-violet-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-violet-300/90">Your API keys are <strong>encrypted end-to-end</strong> and only used when the AI agent needs to execute an action during a conversation.</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <p className="text-emerald-400 text-sm font-medium">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-violet-400 animate-spin" />
        </div>
      ) : (
        /* Provider Cards by Category */
        CATEGORIES.map((cat) => {
          const categoryProviders = PROVIDERS.filter((p) => p.category === cat.key);
          const CatIcon = cat.icon;
          return (
            <div key={cat.key} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2 px-1">
                <CatIcon size={16} className={cat.color} />
                <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">{cat.label}</h2>
              </div>

              {/* Provider Cards */}
              <div className="grid gap-3">
                {categoryProviders.map((prov) => {
                  const connected = isConnected(prov.provider);
                  const expanded = expandedProvider === prov.provider;
                  const Icon = prov.icon;

                  return (
                    <div key={prov.provider} className={`bg-surface-900/50 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 ${
                      connected ? "border-emerald-500/20" : expanded ? "border-violet-500/20" : "border-surface-800"
                    }`}>
                      {/* Card Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-800/30 transition-colors"
                        onClick={() => handleExpand(prov.provider)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${prov.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <Icon size={20} className="text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{prov.displayName}</h3>
                              {connected && (
                                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                                  Connected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-surface-500 mt-0.5">{prov.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {connected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(prov.provider); }}
                              className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {expanded ? <ChevronUp size={18} className="text-surface-500" /> : <ChevronDown size={18} className="text-surface-500" />}
                        </div>
                      </div>

                      {/* Expanded Configuration Panel */}
                      {expanded && (
                        <div className="px-4 pb-5 pt-2 border-t border-surface-800/50 space-y-4">
                          {/* Credential Fields */}
                          {prov.credentialFields.map((field) => (
                            <div key={field.key}>
                              <label className="block text-sm font-medium text-surface-300 mb-1.5">{field.label}</label>
                              {field.type === "textarea" ? (
                                <textarea
                                  value={credentials[field.key] || ""}
                                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  rows={4}
                                  className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600 font-mono resize-none"
                                />
                              ) : (
                                <input
                                  type={field.type === "password" ? "password" : "text"}
                                  value={credentials[field.key] || ""}
                                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600"
                                />
                              )}
                              {field.helpText && <p className="text-xs text-surface-600 mt-1">{field.helpText}</p>}
                            </div>
                          ))}

                          {/* Config Fields */}
                          {prov.configFields && prov.configFields.length > 0 && (
                            <>
                              <div className="border-t border-surface-800/50 pt-3">
                                <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Configuration</p>
                              </div>
                              {prov.configFields.map((field) => (
                                <div key={field.key}>
                                  <label className="block text-sm font-medium text-surface-300 mb-1.5">{field.label}</label>
                                  <input
                                    type="text"
                                    value={configValues[field.key] || ""}
                                    onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600"
                                  />
                                  {field.helpText && <p className="text-xs text-surface-600 mt-1">{field.helpText}</p>}
                                </div>
                              ))}
                            </>
                          )}

                          {/* Currently Connected Info */}
                          {connected && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                              <p className="text-xs text-emerald-400 font-medium mb-1">Currently Connected</p>
                              <p className="text-xs text-surface-500">Enter new credentials to update, or leave empty to keep existing.</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => handleSave(prov.provider)}
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20 text-sm"
                            >
                              {saving ? (
                                <><Loader2 size={16} className="animate-spin" /> Testing & Saving...</>
                              ) : (
                                <><CheckCircle size={16} /> Test & Save</>
                              )}
                            </button>
                            <button
                              onClick={() => handleExpand(prov.provider)}
                              className="px-4 py-2.5 text-surface-400 hover:text-white text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
