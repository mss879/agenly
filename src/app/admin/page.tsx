"use client";
import { useEffect, useState } from "react";
import {
  Users, DollarSign, TrendingUp, UserPlus, Bot, MessageSquare,
  Activity, Crown, Clock, XCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  trialUsers: number;
  cancelledUsers: number;
  planDistribution: { starter: number; pro: number; enterprise: number };
  mrr: number;
  signups: { today: number; thisWeek: number; thisMonth: number };
  platform: { totalAgents: number; totalConversations: number; totalMessages: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return <div className="text-white/50">Failed to load stats</div>;

  const mainCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Paid Subscribers", value: stats.paidUsers, icon: Crown, color: "from-emerald-500 to-green-500" },
    { label: "Trial Users", value: stats.trialUsers, icon: Clock, color: "from-amber-500 to-orange-500" },
    { label: "Monthly Revenue", value: `$${stats.mrr}`, icon: DollarSign, color: "from-[#7C3AED] to-[#8B5CF6]" },
  ];

  const signupCards = [
    { label: "Today", value: stats.signups.today },
    { label: "This Week", value: stats.signups.thisWeek },
    { label: "This Month", value: stats.signups.thisMonth },
  ];

  const platformCards = [
    { label: "Total Agents", value: stats.platform.totalAgents, icon: Bot },
    { label: "Conversations", value: stats.platform.totalConversations, icon: MessageSquare },
    { label: "Messages", value: stats.platform.totalMessages, icon: Activity },
  ];

  const maxPlan = Math.max(stats.planDistribution.starter, stats.planDistribution.pro, stats.planDistribution.enterprise, 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/50 mt-1">Real-time platform analytics and user insights</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-sm text-white/50">{card.label}</p>
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Plan Distribution</h2>
          <div className="space-y-4">
            {[
              { name: "Starter ($10)", count: stats.planDistribution.starter, color: "bg-emerald-500" },
              { name: "Pro ($29)", count: stats.planDistribution.pro, color: "bg-[#7C3AED]" },
              { name: "Enterprise ($99)", count: stats.planDistribution.enterprise, color: "bg-amber-500" },
            ].map((plan) => (
              <div key={plan.name} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">{plan.name}</span>
                  <span className="text-white font-medium">{plan.count} users</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${plan.color} transition-all duration-700`}
                    style={{ width: `${(plan.count / maxPlan) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signups */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-[#8B5CF6]" /> New Signups
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {signupCards.map((card) => (
              <div key={card.label} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-white/40 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/50 mb-3">User Breakdown</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-white/60">Active: {stats.paidUsers}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-white/60">Trial: {stats.trialUsers}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-white/60">Cancelled: {stats.cancelledUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Platform Activity</h2>
        <div className="grid grid-cols-3 gap-6">
          {platformCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <Icon size={20} className="text-white/60" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-white/40">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
