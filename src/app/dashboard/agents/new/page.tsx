"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "customer_service",
    system_prompt: "You are a helpful customer service agent. Answer questions accurately and professionally based on the knowledge base provided. If you don't know the answer, say so honestly.",
    welcome_message: "Hello! How can I help you today?",
    chat_model: "gemini-3.1-pro-preview",
    embedding_model: "gemini-embedding-2-preview",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        setError(`Failed to create agent: ${errMsg}`);
        return;
      }

      router.push(`/dashboard/agents/${data.agent.id}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to create agent: ${errMsg}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents" className="p-2 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700 transition-colors">
          <ArrowLeft size={18} className="text-surface-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Agent</h1>
          <p className="text-surface-400 text-sm mt-1">Set up a new AI agent for your client</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-8 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm font-medium">Error</p>
            <p className="text-red-300/80 text-xs mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Agent Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
            placeholder="e.g. Acme Corp Support Agent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Agent Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
          >
            <option value="customer_service">Customer Service</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">System Prompt</label>
          <textarea
            rows={5}
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all resize-none"
            placeholder="Instructions for how the agent should behave..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Welcome Message</label>
          <input
            type="text"
            value={formData.welcome_message}
            onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
            placeholder="Hello! How can I help you?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Chat Model</label>
            <select
              value={formData.chat_model}
              onChange={(e) => setFormData({ ...formData, chat_model: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            >
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Embedding Model</label>
            <select
              value={formData.embedding_model}
              onChange={(e) => setFormData({ ...formData, embedding_model: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            >
              <option value="gemini-embedding-2-preview">Gemini Embedding 2</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-surface-800">
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary-500/25"
          >
            {loading ? "Creating..." : "Create Agent"}
          </button>
        </div>
      </form>
    </div>
  );
}
