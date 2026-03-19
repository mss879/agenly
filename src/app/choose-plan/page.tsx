"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Sparkles, Crown, Rocket, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "starter",
    displayName: "Starter",
    price: 10,
    description: "Perfect for getting started",
    icon: Sparkles,
    color: "from-emerald-500 to-green-500",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    features: [
      "1 AI Agent",
      "500 messages / month",
      "500K tokens",
      "5 knowledge files",
      "100 MB storage",
      "Website widget",
      "Calendly integration",
    ],
    notIncluded: [
      "WhatsApp channel",
      "Custom branding",
    ],
  },
  {
    name: "pro",
    displayName: "Pro",
    price: 29,
    description: "For growing businesses",
    icon: Crown,
    color: "from-[#7C3AED] to-[#8B5CF6]",
    borderColor: "border-[#7C3AED]/30 hover:border-[#7C3AED]/60",
    popular: true,
    features: [
      "5 AI Agents",
      "5,000 messages / month",
      "5M tokens",
      "50 knowledge files",
      "1 GB storage",
      "Website + WhatsApp",
      "Custom branding",
      "3 guardrails + flows",
    ],
    notIncluded: [
      "Instagram DM",
    ],
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    price: 99,
    description: "Unlimited power at scale",
    icon: Rocket,
    color: "from-amber-500 to-orange-500",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    features: [
      "Unlimited AI Agents",
      "50,000 messages / month",
      "50M tokens",
      "Unlimited knowledge files",
      "10 GB storage",
      "All channels",
      "All integrations",
      "All guardrails + flows",
    ],
    notIncluded: [],
  },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planName: string) => {
    setLoading(planName);
    try {
      const res = await fetch("/api/plan/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName }),
      });
      if (!res.ok) throw new Error("Failed to select plan");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] px-4 py-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <Image src="/logo.png" alt="Agenly Logo" width={36} height={36} className="object-contain" />
            <span className="text-xl font-bold text-white tracking-widest">AGENLY</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Choose Your Plan</h1>
          <p className="text-white/50 text-sm">
            Every plan includes a <span className="text-[#8B5CF6] font-semibold">2-day free trial</span> — no credit card required
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.popular;
            return (
              <div
                key={plan.name}
                className={`relative bg-white/[0.03] backdrop-blur-xl border rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px] ${plan.borderColor} ${isPopular ? "ring-2 ring-[#7C3AED]/30" : ""}`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white text-[10px] font-bold rounded-full shadow-[0_0_12px_rgba(124,58,237,0.3)]">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-2.5 ${isPopular ? "mt-1" : ""}`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">{plan.displayName}</h2>
                <p className="text-xs text-white/40 mb-2">{plan.description}</p>

                {/* Price */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    <span className="text-white/40 text-xs">/ month</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-1.5 mb-4 ${
                    isPopular
                      ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_0_16px_rgba(124,58,237,0.3)]"
                      : "bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.1]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.name ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>Start Free Trial <ArrowRight size={13} /></>
                  )}
                </button>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
                        <Check size={9} className="text-white" />
                      </div>
                      <span className="text-xs text-white/70">{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] text-white/20">✕</span>
                      </div>
                      <span className="text-xs text-white/30 line-through">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-[10px] mt-4">
          All plans include a 2-day free trial. Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
