"use client";
import { useState, useRef, useEffect, use } from "react";
import { Send, User, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

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
          agent_id: agentId,
          conversation_id: conversationId,
          mode: "preview",
        }),
      });

      const data = await res.json();
      if (data.error) {
        const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        throw new Error(errMsg);
      }

      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Error:** ${e instanceof Error ? e.message : "Something went wrong"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <Image src="/robothead.png" alt="Robot Icon" width={16} height={16} />
          </div>
          <div>
            <p className="font-medium text-white text-sm">Preview Chat</p>
            <p className="text-xs text-surface-500">Testing mode · Markdown enabled</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-800 transition-colors" title="Reset conversation">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Image src="/robothead.png" alt="Robot Icon" width={48} height={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-surface-400 text-sm">Send a message to test your agent</p>
              <p className="text-surface-600 text-xs mt-1">Supports tables, lists, headers, and rich formatting</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Image src="/robothead.png" alt="Robot Icon" width={14} height={14} />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary-600 text-white rounded-br-md"
                : "bg-surface-800 text-surface-200 rounded-bl-md"
            }`}>
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
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-surface-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Image src="/robothead.png" alt="Robot Icon" width={14} height={14} />
            </div>
            <div className="bg-surface-800 px-4 py-3 rounded-2xl rounded-bl-md">
              <Loader2 size={16} className="text-primary-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 transition-all text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
