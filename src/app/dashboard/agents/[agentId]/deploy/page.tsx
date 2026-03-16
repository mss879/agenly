"use client";
import { useEffect, useState, use } from "react";
import { Rocket, Globe, Plus, Trash2, Copy, CheckCircle } from "lucide-react";

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

  useEffect(() => {
    fetchDeployments();
  }, [agentId]);

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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const platformUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <div className="space-y-6">
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
                
                {/* Tabs */}
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

                {/* Code Block */}
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
    </div>
  );
}
