"use client";
import { useEffect, useState, use } from "react";
import {
  Brain, GitBranch, Shield, Plus, Trash2, Save, Loader2,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  MessageSquare, ClipboardList, AlertTriangle, CheckCircle,
  X, GripVertical,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ─── Types ───
interface FlowStep {
  type: "message" | "collect";
  content: string;
  field: string;
  prompt: string;
  validation: "none" | "required" | "email" | "phone" | "number";
}

interface FlowTrigger {
  type: "keyword" | "intent";
  keywords: string[];
}

interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: FlowTrigger;
  steps: FlowStep[];
  priority: number;
}

interface Guardrails {
  enabled: boolean;
  blocked_topics: string[];
  allowed_topics: string[];
  blocked_response: string;
  max_response_length: number | null;
  require_knowledge_base: boolean;
  hallucination_guard: boolean;
  pii_redaction: boolean;
  custom_rules: string[];
}

const DEFAULT_GUARDRAILS: Guardrails = {
  enabled: false,
  blocked_topics: [],
  allowed_topics: [],
  blocked_response: "I can only help with questions related to our products and services. Is there something else I can assist you with?",
  max_response_length: null,
  require_knowledge_base: false,
  hallucination_guard: false,
  pii_redaction: false,
  custom_rules: [],
};

const EMPTY_STEP: FlowStep = { type: "message", content: "", field: "", prompt: "", validation: "none" };

export default function BehaviorPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [activeTab, setActiveTab] = useState<"flows" | "guardrails">("flows");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flows UI state
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [addingFlow, setAddingFlow] = useState(false);

  // Guardrails UI state
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const [newAllowedTopic, setNewAllowedTopic] = useState("");
  const [newCustomRule, setNewCustomRule] = useState("");

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      if (data.agent) {
        setFlows(data.agent.flows || []);
        // Merge with defaults to ensure all fields exist (existing agents may have {} from DB)
        const rawGuardrails = data.agent.guardrails;
        setGuardrails({
          ...DEFAULT_GUARDRAILS,
          ...(rawGuardrails && typeof rawGuardrails === "object" ? rawGuardrails : {}),
          // Ensure arrays are always arrays even if DB has null
          blocked_topics: Array.isArray(rawGuardrails?.blocked_topics) ? rawGuardrails.blocked_topics : [],
          allowed_topics: Array.isArray(rawGuardrails?.allowed_topics) ? rawGuardrails.allowed_topics : [],
          custom_rules: Array.isArray(rawGuardrails?.custom_rules) ? rawGuardrails.custom_rules : [],
        });
      }
    } catch (e) {
      console.error("Failed to fetch agent:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flows, guardrails }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ─── Flow Helpers ───
  function addFlow() {
    const newFlow: Flow = {
      id: uuidv4(),
      name: "",
      enabled: true,
      trigger: { type: "keyword", keywords: [] },
      steps: [{ ...EMPTY_STEP }],
      priority: flows.length + 1,
    };
    setFlows([...flows, newFlow]);
    setExpandedFlow(newFlow.id);
    setAddingFlow(true);
  }

  function updateFlow(id: string, updates: Partial<Flow>) {
    setFlows(flows.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function deleteFlow(id: string) {
    setFlows(flows.filter((f) => f.id !== id));
    if (expandedFlow === id) setExpandedFlow(null);
  }

  function toggleFlow(id: string) {
    setFlows(flows.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }

  function addStep(flowId: string) {
    setFlows(flows.map((f) => f.id === flowId ? { ...f, steps: [...f.steps, { ...EMPTY_STEP }] } : f));
  }

  function updateStep(flowId: string, stepIndex: number, updates: Partial<FlowStep>) {
    setFlows(flows.map((f) => {
      if (f.id !== flowId) return f;
      const newSteps = [...f.steps];
      newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
      return { ...f, steps: newSteps };
    }));
  }

  function deleteStep(flowId: string, stepIndex: number) {
    setFlows(flows.map((f) => {
      if (f.id !== flowId) return f;
      return { ...f, steps: f.steps.filter((_, i) => i !== stepIndex) };
    }));
  }

  function addKeyword(flowId: string, keyword: string) {
    if (!keyword.trim()) return;
    setFlows(flows.map((f) => {
      if (f.id !== flowId) return f;
      if (f.trigger.keywords.includes(keyword.trim())) return f;
      return { ...f, trigger: { ...f.trigger, keywords: [...f.trigger.keywords, keyword.trim()] } };
    }));
  }

  function removeKeyword(flowId: string, keyword: string) {
    setFlows(flows.map((f) => {
      if (f.id !== flowId) return f;
      return { ...f, trigger: { ...f.trigger, keywords: f.trigger.keywords.filter((k) => k !== keyword) } };
    }));
  }

  // ─── Guardrails Helpers ───
  function addBlockedTopic() {
    if (!newBlockedTopic.trim()) return;
    if (!guardrails.blocked_topics.includes(newBlockedTopic.trim())) {
      setGuardrails({ ...guardrails, blocked_topics: [...guardrails.blocked_topics, newBlockedTopic.trim()] });
    }
    setNewBlockedTopic("");
  }

  function addAllowedTopic() {
    if (!newAllowedTopic.trim()) return;
    if (!guardrails.allowed_topics.includes(newAllowedTopic.trim())) {
      setGuardrails({ ...guardrails, allowed_topics: [...guardrails.allowed_topics, newAllowedTopic.trim()] });
    }
    setNewAllowedTopic("");
  }

  function addCustomRule() {
    if (!newCustomRule.trim()) return;
    setGuardrails({ ...guardrails, custom_rules: [...guardrails.custom_rules, newCustomRule.trim()] });
    setNewCustomRule("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary-400 animate-spin" />
      </div>
    );
  }

  const enabledFlows = flows.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Behavior</h1>
            <p className="text-sm text-surface-400">Configure conversation flows and safety guardrails for your agent</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/25"
        >
          <Save size={18} />
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      {/* Status Badges */}
      <div className="flex gap-3">
        {enabledFlows > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <GitBranch size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-violet-400">{enabledFlows} Active Flow{enabledFlows > 1 ? "s" : ""}</span>
          </div>
        )}
        {guardrails.enabled && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Shield size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Guardrails Active</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-1 p-1 bg-surface-900/50 border border-surface-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("flows")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "flows"
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
              : "text-surface-400 hover:text-white hover:bg-surface-800/50"
          }`}
        >
          <GitBranch size={16} />
          Flows
          {flows.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-violet-500/20 text-violet-400 rounded-full">{flows.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("guardrails")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "guardrails"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-surface-400 hover:text-white hover:bg-surface-800/50"
          }`}
        >
          <Shield size={16} />
          Guardrails
          {guardrails.enabled && (
            <span className="ml-1 w-2 h-2 bg-emerald-400 rounded-full inline-block" />
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FLOWS TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "flows" && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-violet-500/5 border border-violet-500/10 rounded-xl p-4">
            <GitBranch size={18} className="text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-violet-300/90">
                <strong>Conversation Flows</strong> let your agent follow structured steps when specific topics come up.
                For example: when someone says &quot;return&quot;, guide them through collecting an order number, then a reason, then confirm.
              </p>
              <p className="text-xs text-surface-500 mt-1">Flows are optional — your agent works normally for any topics without a matching flow.</p>
            </div>
          </div>

          {/* Flow List */}
          {flows.length === 0 && !addingFlow ? (
            <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-12 text-center">
              <GitBranch size={40} className="text-surface-600 mx-auto mb-4" />
              <p className="text-surface-400 text-sm">No conversation flows configured</p>
              <p className="text-surface-600 text-xs mt-1">Create a flow to guide your agent through multi-step conversations</p>
              <button
                onClick={addFlow}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 text-sm"
              >
                <Plus size={16} />
                Create Your First Flow
              </button>
            </div>
          ) : (
            <>
              {flows.map((flow) => {
                const isExpanded = expandedFlow === flow.id;
                return (
                  <div
                    key={flow.id}
                    className={`bg-surface-900/50 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isExpanded ? "border-violet-500/20" : flow.enabled ? "border-surface-700" : "border-surface-800 opacity-60"
                    }`}
                  >
                    {/* Flow Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-800/30 transition-colors"
                      onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-surface-600" />
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFlow(flow.id); }}
                          className="flex-shrink-0"
                        >
                          {flow.enabled ? (
                            <ToggleRight size={24} className="text-violet-400" />
                          ) : (
                            <ToggleLeft size={24} className="text-surface-600" />
                          )}
                        </button>
                        <div>
                          <h3 className="font-semibold text-white text-sm">
                            {flow.name || "Untitled Flow"}
                          </h3>
                          <p className="text-xs text-surface-500 mt-0.5">
                            {flow.trigger.keywords.length > 0
                              ? `Triggers: ${flow.trigger.keywords.join(", ")}`
                              : "No triggers set"}
                            {" · "}
                            {flow.steps.length} step{flow.steps.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFlow(flow.id); }}
                          className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isExpanded ? <ChevronUp size={18} className="text-surface-500" /> : <ChevronDown size={18} className="text-surface-500" />}
                      </div>
                    </div>

                    {/* Expanded Flow Editor */}
                    {isExpanded && (
                      <div className="px-4 pb-5 pt-2 border-t border-surface-800/50 space-y-5">
                        {/* Flow Name */}
                        <div>
                          <label className="block text-sm font-medium text-surface-300 mb-1.5">Flow Name</label>
                          <input
                            type="text"
                            value={flow.name}
                            onChange={(e) => updateFlow(flow.id, { name: e.target.value })}
                            placeholder="e.g., Return Request, Pricing Inquiry"
                            className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600"
                          />
                        </div>

                        {/* Trigger */}
                        <div>
                          <label className="block text-sm font-medium text-surface-300 mb-1.5">Trigger Keywords</label>
                          <p className="text-xs text-surface-500 mb-2">When the user&apos;s message contains any of these words, this flow activates</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {flow.trigger.keywords.map((kw) => (
                              <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-violet-400">
                                {kw}
                                <button onClick={() => removeKeyword(flow.id, kw)} className="hover:text-red-400 transition-colors">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <KeywordInput onAdd={(kw) => addKeyword(flow.id, kw)} />
                        </div>

                        {/* Steps */}
                        <div>
                          <label className="block text-sm font-medium text-surface-300 mb-3">Steps</label>
                          <div className="space-y-3">
                            {flow.steps.map((step, si) => (
                              <div key={si} className="bg-surface-800/30 border border-surface-700/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-violet-500/10 text-violet-400 text-xs font-bold flex items-center justify-center">
                                      {si + 1}
                                    </span>
                                    <select
                                      value={step.type}
                                      onChange={(e) => updateStep(flow.id, si, { type: e.target.value as "message" | "collect" })}
                                      className="px-3 py-1.5 bg-surface-800/50 border border-surface-700 rounded-lg text-white text-xs outline-none focus:border-violet-500 transition-all"
                                    >
                                      <option value="message">💬 Send Message</option>
                                      <option value="collect">📋 Collect Data</option>
                                    </select>
                                  </div>
                                  {flow.steps.length > 1 && (
                                    <button
                                      onClick={() => deleteStep(flow.id, si)}
                                      className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>

                                {step.type === "message" ? (
                                  <textarea
                                    value={step.content}
                                    onChange={(e) => updateStep(flow.id, si, { content: e.target.value })}
                                    placeholder="What should the agent say? e.g., I'd be happy to help with your return!"
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600 resize-none"
                                  />
                                ) : (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-surface-500 mb-1">Field Name</label>
                                      <input
                                        type="text"
                                        value={step.field}
                                        onChange={(e) => updateStep(flow.id, si, { field: e.target.value })}
                                        placeholder="e.g., order_number"
                                        className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-white outline-none focus:border-violet-500 transition-all text-xs placeholder:text-surface-600 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-surface-500 mb-1">Validation</label>
                                      <select
                                        value={step.validation}
                                        onChange={(e) => updateStep(flow.id, si, { validation: e.target.value as FlowStep["validation"] })}
                                        className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-white text-xs outline-none focus:border-violet-500 transition-all"
                                      >
                                        <option value="none">None</option>
                                        <option value="required">Required</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone Number</option>
                                        <option value="number">Number</option>
                                      </select>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs text-surface-500 mb-1">Prompt (what the agent asks)</label>
                                      <input
                                        type="text"
                                        value={step.prompt}
                                        onChange={(e) => updateStep(flow.id, si, { prompt: e.target.value })}
                                        placeholder="e.g., Could you please provide your order number?"
                                        className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-white outline-none focus:border-violet-500 transition-all text-xs placeholder:text-surface-600"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => addStep(flow.id)}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-xl hover:bg-violet-500/10 transition-all"
                          >
                            <Plus size={14} />
                            Add Step
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Flow Button */}
              <button
                onClick={addFlow}
                className="w-full py-3 border-2 border-dashed border-surface-700 rounded-2xl text-surface-500 hover:text-violet-400 hover:border-violet-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Flow
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* GUARDRAILS TAB */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === "guardrails" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
            <Shield size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-emerald-300/90">
                <strong>Guardrails</strong> define safety rules your agent must follow at all times.
                Block certain topics, prevent hallucinations, protect PII, and add custom rules.
              </p>
              <p className="text-xs text-surface-500 mt-1">All guardrails are optional — enable only what you need.</p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Enable Guardrails</h3>
                <p className="text-sm text-surface-400 mt-0.5">Turn on safety controls for this agent</p>
              </div>
              <button
                onClick={() => setGuardrails({ ...guardrails, enabled: !guardrails.enabled })}
                className="flex-shrink-0"
              >
                {guardrails.enabled ? (
                  <ToggleRight size={36} className="text-emerald-400" />
                ) : (
                  <ToggleLeft size={36} className="text-surface-600" />
                )}
              </button>
            </div>
          </div>

          {guardrails.enabled && (
            <>
              {/* Blocked Topics */}
              <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    Blocked Topics
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">The agent will refuse to discuss these topics</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guardrails.blocked_topics.map((topic) => (
                    <span key={topic} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                      {topic}
                      <button
                        onClick={() => setGuardrails({ ...guardrails, blocked_topics: guardrails.blocked_topics.filter((t) => t !== topic) })}
                        className="hover:text-red-300 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockedTopic}
                    onChange={(e) => setNewBlockedTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addBlockedTopic(); } }}
                    placeholder="Type a topic and press Enter..."
                    className="flex-1 px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-red-500 transition-all text-sm placeholder:text-surface-600"
                  />
                  <button
                    onClick={addBlockedTopic}
                    className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-sm font-medium"
                  >
                    Add
                  </button>
                </div>

                {/* Blocked Response */}
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">Response when blocked topic is detected</label>
                  <textarea
                    value={guardrails.blocked_response}
                    onChange={(e) => setGuardrails({ ...guardrails, blocked_response: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm placeholder:text-surface-600 resize-none"
                  />
                </div>
              </div>

              {/* Allowed Topics */}
              <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400" />
                    Allowed Topics
                    <span className="text-[10px] text-surface-500 font-normal">(Optional)</span>
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">If set, the agent will ONLY discuss these topics. Leave empty to allow all non-blocked topics.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guardrails.allowed_topics.map((topic) => (
                    <span key={topic} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                      {topic}
                      <button
                        onClick={() => setGuardrails({ ...guardrails, allowed_topics: guardrails.allowed_topics.filter((t) => t !== topic) })}
                        className="hover:text-emerald-300 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllowedTopic}
                    onChange={(e) => setNewAllowedTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addAllowedTopic(); } }}
                    placeholder="Type a topic and press Enter..."
                    className="flex-1 px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm placeholder:text-surface-600"
                  />
                  <button
                    onClick={addAllowedTopic}
                    className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Safety Toggles */}
              <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 space-y-5">
                <h3 className="font-semibold text-white">Safety Controls</h3>

                {/* Hallucination Guard */}
                <div className="flex items-center justify-between py-3 border-b border-surface-800/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Hallucination Guard</p>
                    <p className="text-xs text-surface-500 mt-0.5">Agent admits when it doesn&apos;t know something instead of making up answers</p>
                  </div>
                  <button onClick={() => setGuardrails({ ...guardrails, hallucination_guard: !guardrails.hallucination_guard })}>
                    {guardrails.hallucination_guard ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} className="text-surface-600" />}
                  </button>
                </div>

                {/* Knowledge-only mode */}
                <div className="flex items-center justify-between py-3 border-b border-surface-800/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Knowledge-Only Mode</p>
                    <p className="text-xs text-surface-500 mt-0.5">Only answer from the uploaded knowledge base — ignore general AI knowledge</p>
                  </div>
                  <button onClick={() => setGuardrails({ ...guardrails, require_knowledge_base: !guardrails.require_knowledge_base })}>
                    {guardrails.require_knowledge_base ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} className="text-surface-600" />}
                  </button>
                </div>

                {/* PII Redaction */}
                <div className="flex items-center justify-between py-3 border-b border-surface-800/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">PII Protection</p>
                    <p className="text-xs text-surface-500 mt-0.5">Prevent the agent from repeating sensitive data like credit cards or SSNs</p>
                  </div>
                  <button onClick={() => setGuardrails({ ...guardrails, pii_redaction: !guardrails.pii_redaction })}>
                    {guardrails.pii_redaction ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} className="text-surface-600" />}
                  </button>
                </div>

                {/* Max Response Length */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Max Response Length</p>
                    <p className="text-xs text-surface-500 mt-0.5">Limit how long the agent&apos;s responses can be (in characters)</p>
                  </div>
                  <input
                    type="number"
                    value={guardrails.max_response_length || ""}
                    onChange={(e) => setGuardrails({ ...guardrails, max_response_length: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="No limit"
                    className="w-28 px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-white text-sm outline-none focus:border-emerald-500 transition-all text-center placeholder:text-surface-600"
                  />
                </div>
              </div>

              {/* Custom Rules */}
              <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <ClipboardList size={16} className="text-amber-400" />
                    Custom Rules
                  </h3>
                  <p className="text-xs text-surface-500 mt-1">Add any additional rules the agent must follow</p>
                </div>
                <div className="space-y-2">
                  {guardrails.custom_rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 group">
                      <span className="text-xs text-surface-600 mt-1.5 flex-shrink-0">•</span>
                      <p className="flex-1 text-sm text-surface-300 bg-surface-800/30 px-3 py-2 rounded-lg">{rule}</p>
                      <button
                        onClick={() => setGuardrails({ ...guardrails, custom_rules: guardrails.custom_rules.filter((_, ri) => ri !== i) })}
                        className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomRule}
                    onChange={(e) => setNewCustomRule(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addCustomRule(); } }}
                    placeholder="e.g., Never promise specific delivery dates"
                    className="flex-1 px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm placeholder:text-surface-600"
                  />
                  <button
                    onClick={addCustomRule}
                    className="px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Keyword Input Component ───
function KeywordInput({ onAdd }: { onAdd: (keyword: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
        placeholder="Type a keyword and press Enter..."
        className="flex-1 px-3.5 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-violet-500 transition-all text-sm placeholder:text-surface-600"
      />
      <button
        onClick={handleSubmit}
        className="px-4 py-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all text-sm font-medium"
      >
        Add
      </button>
    </div>
  );
}
