"use client";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Database, MessageSquare, DollarSign, Eye, Zap } from "lucide-react";
import { formatNumber, formatCurrency, formatBytes } from "@/lib/utils";

export default function UsagePage() {
  const [rollups, setRollups] = useState<Array<Record<string, unknown>>>([]);
  const [estimate, setEstimate] = useState<Record<string, unknown> | null>(null);
  const [granularity, setGranularity] = useState<"daily" | "monthly">("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [granularity]);

  async function fetchData() {
    setLoading(true);
    try {
      const [rollupsRes, estimateRes] = await Promise.all([
        fetch(`/api/usage/rollups?granularity=${granularity}`),
        fetch("/api/billing/estimate"),
      ]);
      const rollupsData = await rollupsRes.json();
      const estimateData = await estimateRes.json();
      setRollups(rollupsData.rollups || []);
      setEstimate(estimateData.estimate || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Aggregate rollups
  const totals = rollups.reduce<{ requests: number; promptTokens: number; outputTokens: number; totalTokens: number; embeddings: number; providerCost: number; previewRequests: number; deployedRequests: number; storageDelta: number; files: number }>(
    (acc, r) => ({
      requests: acc.requests + Number(r.request_count || 0),
      promptTokens: acc.promptTokens + Number(r.prompt_token_count || 0),
      outputTokens: acc.outputTokens + Number(r.output_token_count || 0),
      totalTokens: acc.totalTokens + Number(r.total_token_count || 0),
      embeddings: acc.embeddings + Number(r.embedding_count || 0),
      providerCost: acc.providerCost + Number(r.provider_cost_estimate || 0),
      previewRequests: acc.previewRequests + Number(r.preview_request_count || 0),
      deployedRequests: acc.deployedRequests + Number(r.deployed_request_count || 0),
      storageDelta: acc.storageDelta + Number(r.storage_bytes_delta || 0),
      files: acc.files + Number(r.uploaded_file_count || 0),
    }),
    { requests: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, embeddings: 0, providerCost: 0, previewRequests: 0, deployedRequests: 0, storageDelta: 0, files: 0 }
  );

  const statCards = [
    { label: "Total Requests", value: formatNumber(totals.requests), icon: Zap, color: "from-primary-500 to-indigo-600" },
    { label: "Total Tokens", value: formatNumber(totals.totalTokens), icon: BarChart3, color: "from-emerald-500 to-teal-600" },
    { label: "Provider Cost", value: formatCurrency(totals.providerCost), icon: DollarSign, color: "from-amber-500 to-orange-600" },
    { label: "Storage Used", value: formatBytes(Math.max(0, totals.storageDelta)), icon: Database, color: "from-rose-500 to-pink-600" },
    { label: "Preview Requests", value: formatNumber(totals.previewRequests), icon: Eye, color: "from-cyan-500 to-blue-600" },
    { label: "Production Requests", value: formatNumber(totals.deployedRequests), icon: TrendingUp, color: "from-violet-500 to-purple-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Usage & Billing</h1>
          <p className="text-surface-400 mt-1">Track usage across all agents and deployments</p>
        </div>
        <div className="flex gap-1 p-1 bg-surface-900/50 border border-surface-800 rounded-xl">
          {(["daily", "monthly"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                granularity === g
                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                  : "text-surface-400 hover:text-white"
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 hover:border-surface-700 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-sm text-surface-400">{card.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Billing Estimate */}
      {estimate && (
        <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Billing Estimate — Current Month</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-surface-400">Plan</p>
              <p className="text-lg font-semibold text-white capitalize">{estimate.plan_name as string}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Base Price</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(Number(estimate.monthly_base_price))}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Token Overage</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(Number(estimate.token_overage_charge))}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Estimated Total</p>
              <p className="text-lg font-bold text-primary-400">{formatCurrency(Number(estimate.total_estimated_charge))}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-surface-800">
            <div>
              <p className="text-sm text-surface-400">Tokens Used</p>
              <p className="text-sm text-white">{formatNumber(Number(estimate.total_tokens_used))} / {formatNumber(Number(estimate.included_tokens))}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Overage Tokens</p>
              <p className="text-sm text-white">{formatNumber(Number(estimate.overage_tokens))}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Storage</p>
              <p className="text-sm text-white">{formatBytes(Number(estimate.total_storage_bytes))} / {formatBytes(Number(estimate.included_storage_bytes))}</p>
            </div>
            <div>
              <p className="text-sm text-surface-400">Provider Cost</p>
              <p className="text-sm text-white">{formatCurrency(Number(estimate.total_provider_cost))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Table */}
      <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-surface-800">
          <h2 className="text-lg font-semibold text-white">Usage Breakdown</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-surface-400">Loading...</div>
        ) : rollups.length === 0 ? (
          <div className="p-12 text-center text-surface-400">No usage data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left p-4 text-surface-400 font-medium">Period</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Requests</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Prompt Tokens</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Output Tokens</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Total Tokens</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Embeddings</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Preview</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Production</th>
                  <th className="text-right p-4 text-surface-400 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {rollups.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-800/20 transition-colors">
                    <td className="p-4 text-white font-mono text-xs">{(r.date || r.month) as string}</td>
                    <td className="p-4 text-right text-surface-300">{formatNumber(Number(r.request_count))}</td>
                    <td className="p-4 text-right text-surface-300">{formatNumber(Number(r.prompt_token_count))}</td>
                    <td className="p-4 text-right text-surface-300">{formatNumber(Number(r.output_token_count))}</td>
                    <td className="p-4 text-right text-white font-medium">{formatNumber(Number(r.total_token_count))}</td>
                    <td className="p-4 text-right text-surface-300">{formatNumber(Number(r.embedding_count))}</td>
                    <td className="p-4 text-right text-surface-300">{Number(r.preview_request_count)}</td>
                    <td className="p-4 text-right text-surface-300">{Number(r.deployed_request_count)}</td>
                    <td className="p-4 text-right text-primary-400">{formatCurrency(Number(r.provider_cost_estimate))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
