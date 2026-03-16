"use client";
import { useEffect, useState, use } from "react";
import { Save } from "lucide-react";

export default function AgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    system_prompt: "",
    welcome_message: "",
    status: "draft",
    chat_model: "gemini-3.1-pro-preview",
    embedding_model: "gemini-embedding-2-preview",
    branding: {
      title: "",
      greeting: "",
      primary_color: "#6366f1",
      background_color: "#0f172a",
      text_color: "#f1f5f9",
      avatar_url: "",
      widget_position: "bottom-right",
    },
  });

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.agent) {
          setAgent(data.agent);
          setForm({
            name: data.agent.name || "",
            system_prompt: data.agent.system_prompt || "",
            welcome_message: data.agent.welcome_message || "",
            status: data.agent.status || "draft",
            chat_model: data.agent.chat_model || "gemini-3.1-pro-preview",
            embedding_model: data.agent.embedding_model || "gemini-embedding-2-preview",
            branding: { ...form.branding, ...(data.agent.branding || {}) },
          });
        }
      });
  }, [agentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!agent) return <div className="text-surface-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white">General Settings</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Agent Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">System Prompt</label>
          <textarea
            rows={6}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Welcome Message</label>
          <p className="text-xs text-surface-500 mb-2">The first message shown when a user opens the chat window</p>
          <input
            type="text"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Chat Model</label>
            <select
              value={form.chat_model}
              onChange={(e) => setForm({ ...form, chat_model: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            >
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Embedding Model</label>
            <select
              value={form.embedding_model}
              onChange={(e) => setForm({ ...form, embedding_model: e.target.value })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
            >
              <option value="gemini-embedding-2-preview">Gemini Embedding 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white">Widget Branding</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Widget Title</label>
            <input
              type="text"
              value={form.branding.title}
              onChange={(e) => setForm({ ...form, branding: { ...form.branding, title: e.target.value } })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
              placeholder="Support Chat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Greeting</label>
            <p className="text-xs text-surface-500 mb-2">A bubble that pops out from the widget to attract visitors</p>
            <input
              type="text"
              value={form.branding.greeting}
              onChange={(e) => setForm({ ...form, branding: { ...form.branding, greeting: e.target.value } })}
              className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
              placeholder="Hi there! 👋"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.branding.primary_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, primary_color: e.target.value } })}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
              />
              <input
                type="text"
                value={form.branding.primary_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, primary_color: e.target.value } })}
                className="flex-1 px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Background</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.branding.background_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, background_color: e.target.value } })}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
              />
              <input
                type="text"
                value={form.branding.background_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, background_color: e.target.value } })}
                className="flex-1 px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.branding.text_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, text_color: e.target.value } })}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
              />
              <input
                type="text"
                value={form.branding.text_color}
                onChange={(e) => setForm({ ...form, branding: { ...form.branding, text_color: e.target.value } })}
                className="flex-1 px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all font-mono text-sm"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Widget Position</label>
          <select
            value={form.branding.widget_position}
            onChange={(e) => setForm({ ...form, branding: { ...form.branding, widget_position: e.target.value } })}
            className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all"
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/25"
        >
          <Save size={18} />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
