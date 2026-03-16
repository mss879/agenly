"use client";
import { useEffect, useState, useRef } from "react";
import { use } from "react";
import { Send, User, Loader2, X, Minimize2 } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WidgetConfig {
  agent_id: string;
  deployment_id: string;
  branding: {
    title?: string;
    greeting?: string;
    primary_color?: string;
    background_color?: string;
    text_color?: string;
    avatar_url?: string;
  };
  welcome_message: string;
  agent_name: string;
}

export default function WidgetPage({
  params,
}: {
  params: Promise<{ deploymentKey: string }>;
}) {
  const { deploymentKey } = use(params);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConfig();
  }, [deploymentKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/runtime/widget-config?deploymentKey=${deploymentKey}`);
      if (!res.ok) {
        setError("Widget not found or inactive");
        return;
      }
      const data = await res.json();
      setConfig(data);

      // Show welcome message
      if (data.welcome_message) {
        setMessages([{ role: "assistant", content: data.welcome_message }]);
      }
    } catch {
      setError("Failed to load widget");
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !config) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/runtime/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          agent_id: config.agent_id,
          deployment_key: deploymentKey,
          conversation_id: conversationId,
          mode: "production",
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <p style={{ color: "#94a3b8" }}>{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <Loader2 className="animate-spin" style={{ color: "#6366f1" }} size={32} />
      </div>
    );
  }

  const primaryColor = config.branding?.primary_color || "#6366f1";
  const bgColor = config.branding?.background_color || "#0f172a";
  const textColor = config.branding?.text_color || "#f1f5f9";
  const title = config.branding?.title || config.agent_name || "Chat";

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: bgColor, color: textColor, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.1)", background: `linear-gradient(135deg, ${primaryColor}22, transparent)` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: `${primaryColor}20` }}
        >
          <Image src="/robothead.png" alt="Robot Icon" width={16} height={16} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: textColor }}>{title}</p>
          <p className="text-xs" style={{ color: `${textColor}80` }}>Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: `${primaryColor}15` }}
              >
                <Image src="/robothead.png" alt="Robot Icon" width={12} height={12} />
              </div>
            )}
            <div
              className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: primaryColor, color: "white", borderBottomRightRadius: "4px" }
                  : { background: `${textColor}10`, color: textColor, borderBottomLeftRadius: "4px" }
              }
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${primaryColor}15` }}
            >
              <Image src="/robothead.png" alt="Robot Icon" width={12} height={12} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: `${textColor}10` }}>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: `${textColor}08`,
              border: `1px solid ${textColor}15`,
              color: textColor,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3.5 py-2.5 rounded-xl transition-opacity disabled:opacity-30"
            style={{ background: primaryColor, color: "white" }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center mt-2 text-xs" style={{ color: `${textColor}40` }}>
          Powered by Agenly
        </p>
      </div>
    </div>
  );
}
