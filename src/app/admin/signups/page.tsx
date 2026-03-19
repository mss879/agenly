"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface SignupEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  onboarding: {
    experience_level: string | null;
    has_created_agent_before: boolean | null;
    role_title: string | null;
    company_size: string | null;
    primary_use_case: string | null;
    how_heard_about_us: string | null;
  } | null;
}

const labels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
  business_owner: "Business Owner",
  developer: "Developer",
  marketer: "Marketer",
  agency: "Agency",
  other: "Other",
  solo: "Solo",
  "2-10": "2-10",
  "11-50": "11-50",
  "51-200": "51-200",
  "200+": "200+",
  customer_support: "Customer Support",
  sales: "Sales",
  internal_ops: "Internal Ops",
  lead_generation: "Lead Generation",
  google: "Google",
  social_media: "Social Media",
  friend_referral: "Friend Referral",
  blog_article: "Blog/Article",
  youtube: "YouTube",
};

export default function AdminSignupsPage() {
  const [users, setUsers] = useState<SignupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.first_name.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const getLabel = (val: string | null | boolean) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return labels[val] || val;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Signup Data</h1>
        <p className="text-white/50 mt-1">Onboarding questionnaire responses from all users</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-[#7C3AED]/40"
        />
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin inline-block h-6 w-6 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-white/40">No signup data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/40 font-medium">User</th>
                  <th className="text-left p-4 text-white/40 font-medium">Signed Up</th>
                  <th className="text-left p-4 text-white/40 font-medium">Experience</th>
                  <th className="text-left p-4 text-white/40 font-medium">Created Agent Before</th>
                  <th className="text-left p-4 text-white/40 font-medium">Role</th>
                  <th className="text-left p-4 text-white/40 font-medium">Company Size</th>
                  <th className="text-left p-4 text-white/40 font-medium">Use Case</th>
                  <th className="text-left p-4 text-white/40 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-white/40">{user.email}</p>
                    </td>
                    <td className="p-4 text-white/60 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.experience_level ?? null)}</td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.has_created_agent_before ?? null)}</td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.role_title ?? null)}</td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.company_size ?? null)}</td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.primary_use_case ?? null)}</td>
                    <td className="p-4 text-white/70 text-xs">{getLabel(user.onboarding?.how_heard_about_us ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
