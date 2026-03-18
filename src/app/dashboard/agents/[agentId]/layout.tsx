"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, BookOpen, MessageSquare, Rocket, ArrowLeft, Plug } from "lucide-react";
import Image from "next/image";

const tabs = [
  { href: "settings", label: "Settings", icon: Settings },
  { href: "knowledge", label: "Knowledge", icon: BookOpen },
  { href: "integrations", label: "Integrations", icon: Plug },
  { href: "preview", label: "Preview", icon: MessageSquare },
  { href: "deploy", label: "Deploy", icon: Rocket },
];

export default function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const pathname = usePathname();
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((data) => setAgent(data.agent))
      .catch(console.error);
  }, [agentId]);

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents" className="p-2 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700 transition-colors">
          <ArrowLeft size={18} className="text-surface-400" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center border border-primary-500/10">
            <Image src="/robothead.png" alt="Robot Icon" width={20} height={20} className="drop-shadow-sm opacity-90" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{agent?.name as string || "Loading..."}</h1>
            <p className="text-xs text-surface-500">{agent?.type as string} · {agent?.status as string}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-900/50 border border-surface-800 rounded-xl">
        {tabs.map((tab) => {
          const isActive = pathname.includes(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={`/dashboard/agents/${agentId}/${tab.href}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                  : "text-surface-400 hover:text-white hover:bg-surface-800/50"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
