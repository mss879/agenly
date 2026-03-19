"use client";
import { Check, Sparkles, Crown, Rocket } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const plans = [
  {
    name: "starter",
    displayName: "Starter",
    price: 10,
    description: "Perfect for getting started",
    icon: Sparkles,
    color: "from-emerald-500 to-green-500",
    shadowColor: "shadow-emerald-500/20",
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
    shadowColor: "shadow-[#7C3AED]/30",
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
    shadowColor: "shadow-amber-500/20",
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

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-[#fafafa] relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Header */}
        <div className="text-center mb-16 lg:mb-24">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.3em] mb-6">Pricing</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-beras uppercase tracking-wide leading-[1.1] text-gray-900 mb-6">
            Simple, Transparent <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto font-medium">
            Start free for 2 days. No credit card required. Upgrade when you are ready to scale your agents.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                className={`relative bg-white rounded-[2rem] p-8 lg:p-10 transition-all duration-500 hover:-translate-y-2 flex flex-col ${
                  isPopular 
                    ? "border-2 border-purple-500 shadow-[0_20px_60px_-15px_rgba(124,58,237,0.3)] md:-mt-4 md:mb-[-1rem] z-10" 
                    : "border border-gray-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] hover:border-purple-200 hover:shadow-[0_20px_50px_-10px_rgba(124,58,237,0.15)] z-0"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-bold rounded-full shadow-lg uppercase tracking-widest whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} ${plan.shadowColor} flex items-center justify-center mb-6 shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.displayName}</h3>
                <p className="text-sm text-gray-500 font-medium mb-6 min-h-[40px]">{plan.description}</p>
                
                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl lg:text-5xl font-black text-gray-900 font-beras tracking-tight">${plan.price}</span>
                    <span className="text-gray-500 text-sm font-semibold">/ month</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="relative w-full mb-8">
                  <button
                    disabled
                    className={`w-full py-4 rounded-xl text-center text-sm font-bold uppercase tracking-widest cursor-not-allowed opacity-80 ${
                      isPopular
                        ? "btn-3d-purple text-white shadow-xl"
                        : "bg-gray-50 text-gray-400 border border-gray-200"
                    }`}
                  >
                    <span className={isPopular ? "relative z-10 drop-shadow-md" : ""}>
                      Start Free Trial
                    </span>
                  </button>
                  <span className="absolute -top-3 -right-2 bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-700 shadow-xl z-20 whitespace-nowrap tracking-widest uppercase">
                    Coming Soon
                  </span>
                </div>

                {/* Features List */}
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">What's included</p>
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <Check size={12} className="text-white" />
                        </div>
                        <span className="text-sm text-gray-600 font-medium leading-snug">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 opacity-50">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-gray-400 font-bold">✕</span>
                        </div>
                        <span className="text-sm text-gray-500 font-medium leading-snug line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
