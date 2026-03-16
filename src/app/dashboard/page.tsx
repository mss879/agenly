"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const [stats, setStats] = useState({ agents: 0, conversations: 0, messages: 0, files: 0 });
  const [agents, setAgents] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Fetch stats and recent agents in parallel
      const [statsRes, agentsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/agents"),
      ]);

      const statsData = await statsRes.json();
      setStats({
        agents: statsData.agents ?? 0,
        conversations: statsData.conversations ?? 0,
        messages: statsData.messages ?? 0,
        files: statsData.files ?? 0,
      });

      const agentsData = await agentsRes.json();
      setAgents((agentsData.agents || []).slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  }

  const statCards = [
    { label: "Total Agents", value: stats.agents, iconUrl: "/Total Agents.png" },
    { label: "Conversations", value: stats.conversations, iconUrl: "/Conversations.png" },
    { label: "Messages", value: stats.messages, iconUrl: "/Messages.png" },
    { label: "Knowledge Files", value: stats.files, iconUrl: "/Knowledge Files.png" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Header */}
      <div className="relative w-full h-[160px] sm:h-[240px] lg:h-[280px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
        <video
          src="/welcome-optimized.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-right sm:object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-black/40 sm:bg-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-end sm:items-center p-5 sm:p-8 lg:p-12">
          <div className="max-w-md relative z-10">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              Welcome Back
            </h1>
            <p className="text-white/80 mt-2 sm:mt-3 text-sm sm:text-lg font-medium drop-shadow-sm max-w-[280px]">
              Overview of your AI agent platform and performance metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((card, idx) => {
          return (
            <div key={card.label} className="bg-white/[0.03] backdrop-blur-3xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 border-b-white/5 border-r-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-white/[0.05] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden flex flex-col justify-end min-h-[130px] sm:min-h-[160px]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Top Right Icon */}
              <div className="absolute top-1 sm:-top-4 right-1 sm:right-2 w-20 h-20 sm:w-32 sm:h-32 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] z-10">
                <Image
                  src={card.iconUrl}
                  alt={card.label}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Text Content - Positioned at bottom */}
              <div className="relative z-10 mt-12">
                <p className="text-2xl sm:text-4xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors drop-shadow-sm">{card.value}</p>
                <p className="text-xs sm:text-sm text-white/60 mt-1 font-medium">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Agents */}
      <div className="bg-white/[0.02] backdrop-blur-[40px] rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/10 border-b-white/5 border-r-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h2 className="text-lg sm:text-xl font-bold text-white">Recent Agents</h2>
          <Link href="/dashboard/agents" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        {agents.length === 0 ? (
          <div className="text-center py-12 relative z-10">
            <Image src="/robothead.png" alt="Robot Icon" width={80} height={80} className="mx-auto mb-6 opacity-40" />
            <p className="text-white/50 font-medium">No agents yet</p>
            <Link href="/dashboard/agents/new" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-black rounded-2xl hover:bg-white/90 transition-all duration-300 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105">
              Create your first agent
            </Link>
          </div>
        ) : (
          <div className="space-y-3 relative z-10">
            {agents.map((agent) => (
              <Link
                key={agent.id as string}
                href={`/dashboard/agents/${agent.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 border-b-transparent border-r-transparent transition-all duration-300 group shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-center gap-4">
                  <Image src="/robothead.png" alt="Robot Icon" width={40} height={40} className="opacity-70 group-hover:opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-300" />
                  <div>
                    <p className="font-semibold text-white tracking-wide">{agent.name as string}</p>
                    <p className="text-xs text-white/50 font-medium mt-0.5">{agent.type as string} · {agent.status as string}</p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase shadow-inner ${agent.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    agent.status === "draft" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-white/5 text-white/50 border border-white/10"
                  }`}>
                  {agent.status as string}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
