"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, Clock, TrendingUp, ArrowUpRight, Crown,
  CheckCircle, AlertTriangle, XCircle,
} from "lucide-react";
import type { PlanName } from "@/lib/plan-config";

interface PlanInfo {
  workspaceId: string;
  selectedPlan: PlanName;
  subscriptionStatus: string;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  isAdmin: boolean;
}

const planDisplayNames: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const planPrices: Record<string, number> = {
  starter: 10,
  pro: 29,
  enterprise: 99,
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
  trialing: { label: "Trial", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  past_due: { label: "Past Due", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "text-white/40 bg-white/5 border-white/10", icon: XCircle },
  expired: { label: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
};

export default function BillingPage() {
  const router = useRouter();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlanInfo();
  }, []);

  async function fetchPlanInfo() {
    try {
      const res = await fetch("/api/plan/current");
      const data = await res.json();
      setPlanInfo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: PlanName) {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    );
  }

  const plan = planInfo?.selectedPlan || "starter";
  const status = planInfo?.subscriptionStatus || "trialing";
  const statusInfo = statusConfig[status] || statusConfig.expired;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Plan & Billing</h1>
        <p className="text-white/50 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {planDisplayNames[plan] || plan} Plan
              </h2>
              <p className="text-sm text-white/40">
                ${planPrices[plan] || 0} / month
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${statusInfo.color}`}>
            <StatusIcon size={14} />
            {statusInfo.label}
          </div>
        </div>

        {/* Trial info */}
        {planInfo?.isTrialActive && planInfo.trialEndsAt && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
              <Clock size={16} />
              Free Trial Active
            </div>
            <p className="text-xs text-white/50">
              Your trial ends on{" "}
              <span className="text-white/80 font-medium">
                {new Date(planInfo.trialEndsAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </span>
              {" "}({planInfo.trialDaysRemaining} day{planInfo.trialDaysRemaining !== 1 ? "s" : ""} remaining)
            </p>
          </div>
        )}

        {/* Admin badge */}
        {planInfo?.isAdmin && (
          <div className="bg-[#7C3AED]/5 border border-[#7C3AED]/10 rounded-xl p-4 mb-4">
            <p className="text-sm text-[#8B5CF6] font-medium">🛡️ Admin Account — No limits or restrictions apply</p>
          </div>
        )}

        {/* Upgrade options */}
        {!planInfo?.isAdmin && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {(["starter", "pro", "enterprise"] as PlanName[]).map((p) => {
              const isCurrent = p === plan;
              const isUpgrade = planPrices[p] > (planPrices[plan] || 0);
              return (
                <button
                  key={p}
                  onClick={() => !isCurrent && handleUpgrade(p)}
                  disabled={isCurrent || upgrading !== null}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "bg-[#7C3AED]/10 border-[#7C3AED]/30 cursor-default"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04] cursor-pointer"
                  } disabled:opacity-50`}
                >
                  <p className={`text-sm font-semibold ${isCurrent ? "text-[#8B5CF6]" : "text-white"}`}>
                    {planDisplayNames[p]}
                  </p>
                  <p className="text-lg font-bold text-white mt-1">${planPrices[p]}/mo</p>
                  {isCurrent ? (
                    <span className="text-xs text-[#8B5CF6]">Current</span>
                  ) : isUpgrade ? (
                    <span className="text-xs text-emerald-400 flex items-center justify-center gap-1 mt-1">
                      <ArrowUpRight size={12} /> Upgrade
                    </span>
                  ) : (
                    <span className="text-xs text-white/30 mt-1">Downgrade</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment method info */}
      {status === "active" && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CreditCard size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Payment Active</h2>
              <p className="text-xs text-white/40">Your subscription is managed through Stripe</p>
            </div>
          </div>
          <p className="text-sm text-white/50">
            To manage your payment method or view invoices, click the upgrade button above and you will be redirected to the Stripe Customer Portal.
          </p>
        </div>
      )}
    </div>
  );
}
