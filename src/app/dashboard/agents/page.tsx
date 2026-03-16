"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import Image from "next/image";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = agents.filter((a) =>
    (a.name as string).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agents</h1>
          <p className="text-surface-400 mt-1">Manage your AI agents across workspaces</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all duration-200 shadow-lg shadow-primary-500/25 text-sm"
        >
          <Plus size={18} />
          New Agent
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-surface-900/50 border border-surface-800 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
        />
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-900/50 border border-surface-800 rounded-2xl p-6 animate-pulse">
              <div className="h-10 w-10 bg-surface-800 rounded-xl mb-4" />
              <div className="h-5 bg-surface-800 rounded w-2/3 mb-2" />
              <div className="h-4 bg-surface-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-surface-900/30 border border-surface-800 rounded-2xl">
          <Image src="/robothead.png" alt="Robot Icon" width={80} height={80} className="mx-auto mb-4 opacity-50 drop-shadow-lg" />
          <h3 className="text-xl font-semibold text-white mb-2">No agents found</h3>
          <p className="text-surface-400 mb-6">Create your first AI agent to get started</p>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium"
          >
            <Plus size={18} />
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((agent) => (
            <Link
              key={agent.id as string}
              href={`/dashboard/agents/${agent.id}`}
              className="group bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <Image src="/robothead.png" alt="Robot Icon" width={40} height={40} className="opacity-90 drop-shadow-md" />
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  agent.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  agent.status === "draft" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  agent.status === "paused" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                  "bg-surface-700/50 text-surface-400 border border-surface-600"
                }`}>
                  {agent.status as string}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-primary-300 transition-colors mb-1">
                {agent.name as string}
              </h3>
              <p className="text-sm text-surface-500 mb-4">{agent.type as string}</p>
              <div className="flex items-center gap-4 text-xs text-surface-500">
                <span>Model: {(agent.chat_model as string)?.split("-").slice(0, 2).join("-")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
