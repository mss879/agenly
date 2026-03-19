"use client";
import { useState } from "react";
import Image from "next/image";
import { Clock, Sparkles, Crown, Rocket, ArrowRight } from "lucide-react";
import type { PlanName } from "@/lib/plan-config";

const plans = [
  { name: "starter" as PlanName, displayName: "Starter", price: 10, icon: Sparkles, color: "from-emerald-500 to-green-500" },
  { name: "pro" as PlanName, displayName: "Pro", price: 29, icon: Crown, color: "from-[#7C3AED] to-[#8B5CF6]", popular: true },
  { name: "enterprise" as PlanName, displayName: "Enterprise", price: 99, icon: Rocket, color: "from-amber-500 to-orange-500" },
];

export default function TrialExpiredPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanName) {
    setLoading(plan);
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
        alert(data.error || "Failed to create checkout");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-3xl w-full relative z-10 text-center">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Agenly Logo" width={48} height={48} className="object-contain" />
          <span className="text-2xl font-bold text-white tracking-widest">AGENLY</span>
        </div>

        {/* Expired notice */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Free Trial Has Ended</h1>
          <p className="text-white/50 max-w-md mx-auto">
            Your 2-day free trial has expired. Subscribe to a plan below to continue using Agenly and access all your agents and data.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`bg-white/[0.03] backdrop-blur-xl border rounded-2xl p-6 transition-all hover:translate-y-[-2px] ${
                  plan.popular ? "border-[#7C3AED]/30 ring-2 ring-[#7C3AED]/20" : "border-white/10"
                }`}
              >
                {plan.popular && (
                  <span className="text-[10px] font-bold text-[#8B5CF6] tracking-widest uppercase mb-3 block">Recommended</span>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{plan.displayName}</h3>
                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-white/40 text-sm">/ mo</span>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-4 ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                      : "bg-white/[0.06] border border-white/10 text-white"
                  } disabled:opacity-50`}
                >
                  {loading === plan.name ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>Subscribe Now <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
