"use client";
import { useEffect, useState, use, useCallback } from "react";
import { Rocket, Globe, Plus, Trash2, Copy, CheckCircle, MessageSquare, Phone, Unplug, Loader2, Camera } from "lucide-react";
import WhatsAppSetupWizard from "@/components/whatsapp-setup-wizard";

type TabKey = "html" | "nextjs" | "react" | "wordpress" | "vue" | "shopify";

const TABS: { key: TabKey; label: string }[] = [
  { key: "html", label: "HTML" },
  { key: "nextjs", label: "Next.js" },
  { key: "react", label: "React" },
  { key: "vue", label: "Vue" },
  { key: "wordpress", label: "WordPress" },
  { key: "shopify", label: "Shopify" },
];

function getSnippet(tab: TabKey, platformUrl: string, deploymentKey: string): string {
  switch (tab) {
    case "html":
      return `<!-- Paste before </body> -->
<script 
  src="${platformUrl}/widget/loader.js" 
  data-deployment-key="${deploymentKey}"
  async>
</script>`;
    case "nextjs":
      return `// In your layout.tsx or page.tsx
import Script from "next/script";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script
        src="${platformUrl}/widget/loader.js"
        data-deployment-key="${deploymentKey}"
        strategy="afterInteractive"
      />
    </>
  );
}`;
    case "react":
      return `// In your App.jsx or index.js
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${platformUrl}/widget/loader.js";
    script.setAttribute("data-deployment-key", "${deploymentKey}");
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return <div>Your App</div>;
}`;
    case "vue":
      return `<!-- In your App.vue or main layout -->
<script setup>
import { onMounted, onUnmounted } from "vue";

let script;
onMounted(() => {
  script = document.createElement("script");
  script.src = "${platformUrl}/widget/loader.js";
  script.setAttribute("data-deployment-key", "${deploymentKey}");
  script.async = true;
  document.body.appendChild(script);
});
onUnmounted(() => {
  if (script) document.body.removeChild(script);
});
</script>`;
    case "wordpress":
      return `<!-- Option 1: Add to theme's footer.php before </body> -->
<script 
  src="${platformUrl}/widget/loader.js" 
  data-deployment-key="${deploymentKey}"
  async>
</script>

<!-- Option 2: Use a plugin like "Insert Headers and Footers"
   and paste the above code in the Footer section -->`;
    case "shopify":
      return `<!-- Steps for Shopify:
1. Go to Online Store → Themes → "..." → Edit code
2. Open "theme.liquid"
3. Paste this code just before </body>
-->

<script 
  src="${platformUrl}/widget/loader.js" 
  data-deployment-key="${deploymentKey}"
  async>
</script>

<!-- Alternative: Go to Settings → Custom code
   and paste the script in the "Footer" field -->`;
    default:
      return "";
  }
}

export default function DeployPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [deployments, setDeployments] = useState<Array<Record<string, unknown>>>([]);
  const [newDomain, setNewDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("html");

  // WhatsApp state
  const [whatsappChannel, setWhatsappChannel] = useState<Record<string, unknown> | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [waLoading, setWaLoading] = useState(true);

  // Instagram state
  const [instagramChannel, setInstagramChannel] = useState<Record<string, unknown> | null>(null);
  const [igLoading, setIgLoading] = useState(true);
  const [igConnecting, setIgConnecting] = useState(false);
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  const fetchWhatsApp = useCallback(async () => {
    setWaLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/channels?agentId=${agentId}`);
      const data = await res.json();
      setWhatsappChannel(data.channel || null);
    } catch {
      console.error("Failed to fetch WhatsApp channel");
    } finally {
      setWaLoading(false);
    }
  }, [agentId]);

  const fetchInstagram = useCallback(async () => {
    setIgLoading(true);
    try {
      const res = await fetch(`/api/instagram/channels?agentId=${agentId}`);
      const data = await res.json();
      setInstagramChannel(data.channel || null);
    } catch {
      console.error("Failed to fetch Instagram channel");
    } finally {
      setIgLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchDeployments();
    fetchWhatsApp();
    fetchInstagram();
  }, [agentId, fetchWhatsApp, fetchInstagram]);

  // Check for Instagram OAuth callback results
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "instagram") {
      setChannelTab("instagram");
      if (params.get("connected") === "true") {
        fetchInstagram();
      }
      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchInstagram]);

  async function fetchDeployments() {
    const res = await fetch(`/api/deployments?agentId=${agentId}`);
    const data = await res.json();
    setDeployments(data.deployments || []);
  }

  const handleCreateDeployment = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) fetchDeployments();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeployment = async (deploymentId: string) => {
    if (!confirm("Delete this deployment? The widget will stop working on all sites using it.")) return;
    try {
      await fetch(`/api/deployments/${deploymentId}`, { method: "DELETE" });
      fetchDeployments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDomain = async (deploymentId: string) => {
    if (!newDomain.trim()) return;
    try {
      await fetch(`/api/deployments/${deploymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      setNewDomain("");
      fetchDeployments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm("Disconnect WhatsApp? Your agent will stop receiving WhatsApp messages.")) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/whatsapp/channels?agentId=${agentId}`, { method: "DELETE" });
      setWhatsappChannel(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnectInstagram = async () => {
    setIgConnecting(true);
    try {
      const res = await fetch(`/api/instagram/connect?agentId=${agentId}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      setIgConnecting(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!confirm("Disconnect Instagram? Your agent will stop receiving Instagram DMs.")) return;
    setIgDisconnecting(true);
    try {
      await fetch(`/api/instagram/channels?agentId=${agentId}`, { method: "DELETE" });
      setInstagramChannel(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIgDisconnecting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const platformUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  // ─── Channel-level tab ───
  type ChannelTab = "web" | "whatsapp" | "instagram";
  const [channelTab, setChannelTab] = useState<ChannelTab>("web");

  return (
    <div className="space-y-6">
      {/* ─── Channel Tabs ─── */}
      <div className="flex gap-1 bg-surface-900/50 border border-surface-800 rounded-xl p-1">
        <button
          onClick={() => setChannelTab("web")}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            channelTab === "web"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-surface-400 hover:text-white hover:bg-surface-800"
          }`}
        >
          <Globe size={16} />
          Web Widget
        </button>
        <button
          onClick={() => setChannelTab("whatsapp")}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            channelTab === "whatsapp"
              ? "bg-green-600 text-white shadow-sm"
              : "text-surface-400 hover:text-white hover:bg-surface-800"
          }`}
        >
          <MessageSquare size={16} />
          WhatsApp
          {whatsappChannel && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setChannelTab("instagram")}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            channelTab === "instagram"
              ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm"
              : "text-surface-400 hover:text-white hover:bg-surface-800"
          }`}
        >
          <Camera size={16} />
          Instagram
          {instagramChannel && (
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ─── Web Widget Tab ─── */}
      {channelTab === "web" && (
        <>
          {deployments.length === 0 ? (
            <div className="bg-surface-900/50 border border-surface-800 rounded-2xl p-12 text-center">
              <Rocket size={48} className="text-surface-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Ready to deploy?</h3>
              <p className="text-surface-400 mb-6 max-w-md mx-auto">
                Create a deployment to get your embed code and start using this agent on client websites.
              </p>
              <button
                onClick={handleCreateDeployment}
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/25"
              >
                <Rocket size={18} />
                {creating ? "Creating..." : "Create Deployment"}
              </button>
            </div>
          ) : (
            deployments.map((dep) => {
              const deploymentKey = dep.deployment_key as string;
              const domains = (dep.agent_domains || []) as Array<Record<string, unknown>>;
              const snippet = getSnippet(activeTab, platformUrl, deploymentKey);

              return (
                <div key={dep.id as string} className="bg-surface-900/50 border border-surface-800 rounded-2xl overflow-hidden">
                  {/* Deployment Header */}
                  <div className="p-6 border-b border-surface-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <Rocket size={18} className="text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Deployment</p>
                          <p className="text-xs text-surface-500 font-mono">{deploymentKey}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          dep.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-surface-700 text-surface-400"
                        }`}>
                          {dep.status as string}
                        </span>
                        <button
                          onClick={() => handleDeleteDeployment(dep.id as string)}
                          className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete deployment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Framework Tabs + Embed Code */}
                  <div className="p-6 border-b border-surface-800">
                    <h4 className="text-sm font-medium text-surface-300 mb-3">Integration Guide</h4>
                    
                    <div className="flex gap-1 bg-surface-950/50 rounded-xl p-1 mb-4">
                      {TABS.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeTab === tab.key
                              ? "bg-primary-600 text-white shadow-sm"
                              : "text-surface-400 hover:text-white hover:bg-surface-800"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <pre className="bg-surface-950 border border-surface-800 rounded-xl p-4 text-sm text-surface-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {snippet}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(snippet, `snippet-${dep.id}`)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied === `snippet-${dep.id}` ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} className="text-surface-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Allowed Domains */}
                  <div className="p-6">
                    <h4 className="text-sm font-medium text-surface-300 mb-3">Allowed Domains</h4>
                    <div className="space-y-2 mb-4">
                      {domains.length === 0 ? (
                        <p className="text-surface-500 text-sm">No domain restrictions (all domains allowed)</p>
                      ) : (
                        domains.map((d) => (
                          <div key={d.id as string} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-lg border border-surface-700">
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-surface-400" />
                              <span className="text-sm text-white font-mono">{d.domain as string}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="example.com"
                        className="flex-1 px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 transition-all text-sm font-mono"
                      />
                      <button
                        onClick={() => handleAddDomain(dep.id as string)}
                        className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors text-sm font-medium"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {deployments.length > 0 && (
            <button
              onClick={handleCreateDeployment}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-surface-700 text-surface-300 rounded-xl hover:bg-surface-800/50 transition-colors text-sm"
            >
              <Plus size={16} />
              New Deployment
            </button>
          )}
        </>
      )}

      {/* ─── WhatsApp Tab ─── */}
      {channelTab === "whatsapp" && (
        <div className="bg-surface-900/50 border border-surface-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MessageSquare size={18} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">WhatsApp Channel</h3>
                <p className="text-xs text-surface-400">Deploy your AI agent to WhatsApp Business</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {waLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-surface-500 animate-spin" />
              </div>
            ) : whatsappChannel ? (
              /* Connected State */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Phone size={18} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {(whatsappChannel.phone_display as string) || "WhatsApp Connected"}
                      </p>
                      <p className="text-xs text-surface-400">
                        Phone ID: {whatsappChannel.phone_number_id as string}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      Connected
                    </span>
                    <button
                      onClick={handleDisconnectWhatsApp}
                      disabled={disconnecting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Disconnect WhatsApp"
                    >
                      {disconnecting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Unplug size={12} />
                      )}
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/50">
                  <p className="text-xs text-surface-400 mb-1">Webhook Verify Token</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-surface-300 font-mono flex-1 break-all">
                      {whatsappChannel.verify_token as string}
                    </code>
                    <button
                      onClick={() => copyToClipboard(whatsappChannel.verify_token as string, "wa-vt")}
                      className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 transition-colors shrink-0"
                    >
                      {copied === "wa-vt" ? (
                        <CheckCircle size={12} className="text-green-400" />
                      ) : (
                        <Copy size={12} className="text-surface-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/50">
                  <p className="text-xs text-surface-400 mb-1">Webhook URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-surface-300 font-mono flex-1 break-all">
                      {platformUrl}/webhooks/whatsapp
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${platformUrl}/webhooks/whatsapp`, "wa-url")}
                      className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 transition-colors shrink-0"
                    >
                      {copied === "wa-url" ? (
                        <CheckCircle size={12} className="text-green-400" />
                      ) : (
                        <Copy size={12} className="text-surface-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/50">
                  <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-2">How it works</p>
                  <ul className="text-sm text-surface-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      Customers message your WhatsApp number
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      Your AI agent processes with knowledge base context
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      AI reply is sent back instantly on WhatsApp
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Not Connected State */
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={28} className="text-surface-500" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Connect to WhatsApp</h4>
                <p className="text-surface-400 text-sm mb-6 max-w-md mx-auto">
                  Let customers chat with your AI agent directly on WhatsApp. 
                  You&apos;ll need a Meta Developer account and WhatsApp Business API access.
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-xl hover:from-green-500 hover:to-green-400 transition-all shadow-lg shadow-green-500/25"
                >
                  <MessageSquare size={18} />
                  Connect WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Instagram Tab ─── */}
      {channelTab === "instagram" && (
        <div className="bg-surface-900/50 border border-surface-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                <Camera size={18} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Instagram DMs</h3>
                <p className="text-xs text-surface-400">Deploy your AI agent to Instagram Direct Messages</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {igLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-surface-500 animate-spin" />
              </div>
            ) : instagramChannel ? (
              /* Connected State */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                      <Camera size={18} className="text-pink-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        @{(instagramChannel.username as string) || "Instagram Connected"}
                      </p>
                      <p className="text-xs text-surface-400">
                        Instagram ID: {instagramChannel.instagram_user_id as string}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-pink-400 border border-pink-500/20">
                      Connected
                    </span>
                    <button
                      onClick={handleDisconnectInstagram}
                      disabled={igDisconnecting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Disconnect Instagram"
                    >
                      {igDisconnecting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Unplug size={12} />
                      )}
                      Disconnect
                    </button>
                  </div>
                </div>

                {(instagramChannel.token_expires_at as string) && (
                  <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/50">
                    <p className="text-xs text-surface-400 mb-1">Token Expires</p>
                    <p className="text-xs text-surface-300 font-mono">
                      {new Date(instagramChannel.token_expires_at as string).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric"
                      })}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/50">
                  <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-2">How it works</p>
                  <ul className="text-sm text-surface-300 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      Customers send DMs to your Instagram account
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      Your AI agent responds with knowledge base context
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      Replies are sent instantly via Instagram DMs
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-surface-500 mt-0.5">•</span>
                      <span className="text-surface-500">24-hour reply window per conversation</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Not Connected State */
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-surface-800 flex items-center justify-center mx-auto mb-4">
                  <Camera size={28} className="text-surface-500" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Connect to Instagram</h4>
                <p className="text-surface-400 text-sm mb-6 max-w-md mx-auto">
                  Let customers chat with your AI agent via Instagram DMs.
                  You&apos;ll sign in with Instagram and grant messaging permissions.
                </p>
                <button
                  onClick={handleConnectInstagram}
                  disabled={igConnecting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-400 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/25"
                >
                  {igConnecting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                  {igConnecting ? "Redirecting..." : "Connect Instagram"}
                </button>
                <p className="text-surface-500 text-xs mt-4">
                  Requires an Instagram Business or Creator account
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Setup Wizard Modal */}
      {showWizard && (
        <WhatsAppSetupWizard
          agentId={agentId}
          onComplete={() => {
            setShowWizard(false);
            fetchWhatsApp();
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
