"use client";
import { useEffect, useState } from "react";
import { Search, ChevronDown, UserCog } from "lucide-react";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  onboarding_completed: boolean;
  workspace: { id: string; name: string } | null;
  billing: {
    plan_name: string;
    subscription_status: string;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    is_trial_active: boolean;
  } | null;
  onboarding: Record<string, unknown> | null;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trialing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  past_due: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-white/5 text-white/50 border-white/10",
  expired: "bg-white/5 text-white/40 border-white/10",
};

const planColors: Record<string, string> = {
  starter: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pro: "bg-[#7C3AED]/10 text-[#8B5CF6] border-[#7C3AED]/20",
  enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan(userId: string, planName: string) {
    setUpdatingUser(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan_name: planName }),
      });
      if (res.ok) {
        // Refresh users after update
        await fetchUsers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingUser(null);
      setEditingPlan(null);
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [search, planFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <p className="text-white/50 mt-1">View and manage all registered users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[260px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-[#7C3AED]/40"
          />
        </div>
        {/* Plan filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none cursor-pointer appearance-none min-w-[140px]"
        >
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm outline-none cursor-pointer appearance-none min-w-[160px]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin inline-block h-6 w-6 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-white/40">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/40 font-medium">User</th>
                  <th className="text-left p-4 text-white/40 font-medium">Plan</th>
                  <th className="text-left p-4 text-white/40 font-medium">Status</th>
                  <th className="text-left p-4 text-white/40 font-medium">Signed Up</th>
                  <th className="text-left p-4 text-white/40 font-medium">Onboarding</th>
                  <th className="text-right p-4 text-white/40 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const plan = user.billing?.plan_name || "starter";
                  const status = user.billing?.subscription_status || "trialing";
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* User info */}
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-white/40 mt-0.5">{user.email}</p>
                        </div>
                      </td>
                      {/* Plan */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${planColors[plan] || planColors.starter}`}>
                          {plan}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${statusColors[status] || statusColors.expired}`}>
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      {/* Signed up */}
                      <td className="p-4 text-white/60 text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      {/* Onboarding */}
                      <td className="p-4">
                        <span className={`text-xs ${user.onboarding_completed ? "text-emerald-400" : "text-amber-400"}`}>
                          {user.onboarding_completed ? "✓ Complete" : "⏳ Pending"}
                        </span>
                      </td>
                      {/* Actions - Plan change */}
                      <td className="p-4 text-right">
                        {editingPlan === user.id ? (
                          <div className="inline-flex gap-1">
                            {["starter", "pro", "enterprise"].map((p) => (
                              <button
                                key={p}
                                onClick={() => updatePlan(user.id, p)}
                                disabled={updatingUser === user.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  p === plan
                                    ? "bg-[#7C3AED]/20 border-[#7C3AED]/30 text-[#8B5CF6]"
                                    : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/20"
                                } disabled:opacity-40`}
                              >
                                {p}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditingPlan(null)}
                              className="px-2 py-1.5 text-xs text-white/30 hover:text-white/60"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingPlan(user.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                          >
                            <UserCog size={13} /> Change Plan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
