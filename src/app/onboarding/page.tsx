"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sparkles, User, Briefcase, Megaphone, Code, Users,
  HeadphonesIcon, TrendingUp, Cog, Target, ArrowRight, ArrowLeft, Check,
} from "lucide-react";

const STEPS = [
  { title: "Your Experience", subtitle: "Help us personalize your experience" },
  { title: "About You", subtitle: "Tell us about your role and company" },
  { title: "Your Use Case", subtitle: "What will you use Agenly for?" },
  { title: "One Last Thing", subtitle: "How did you discover us?" },
];

interface OnboardingData {
  experience_level: string;
  has_created_agent_before: boolean | null;
  role_title: string;
  company_size: string;
  primary_use_case: string;
  how_heard_about_us: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    experience_level: "",
    has_created_agent_before: null,
    role_title: "",
    company_size: "",
    primary_use_case: "",
    how_heard_about_us: "",
  });

  const updateField = (field: keyof OnboardingData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.experience_level && data.has_created_agent_before !== null;
      case 1: return data.role_title && data.company_size;
      case 2: return data.primary_use_case;
      case 3: return data.how_heard_about_us;
      default: return false;
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/choose-plan");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const OptionCard = ({
    selected,
    onClick,
    icon: Icon,
    label,
    description,
  }: {
    selected: boolean;
    onClick: () => void;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    description?: string;
  }) => (
    <button
      onClick={onClick}
      className={`relative w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
        selected
          ? "bg-[#7C3AED]/10 border-[#7C3AED]/40"
          : "bg-white/[0.02] border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            selected ? "bg-[#7C3AED]/20" : "bg-white/[0.05]"
          }`}>
            <Icon size={15} className={selected ? "text-[#8B5CF6]" : "text-white/50"} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-[13px] ${selected ? "text-white" : "text-white/80"}`}>{label}</p>
          {description && <p className="text-[11px] text-white/40 leading-tight">{description}</p>}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
            <Check size={10} className="text-white" />
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2.5">
            <Image src="/logo.webp" alt="Agenly Logo" width={36} height={36} className="object-contain" />
            <span className="text-lg font-bold text-white tracking-widest">AGENLY</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i <= step ? "bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]" : ""
                }`}
                style={{ width: i <= step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Step header */}
          <div className="mb-5">
            <p className="text-[10px] text-[#8B5CF6] font-semibold tracking-widest uppercase mb-0.5">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-lg font-bold text-white">{STEPS[step].title}</h2>
            <p className="text-[13px] text-white/50">{STEPS[step].subtitle}</p>
          </div>

          {/* Step 1: Experience */}
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">Have you created an AI agent before?</p>
                <div className="grid grid-cols-2 gap-2">
                  <OptionCard
                    selected={data.has_created_agent_before === true}
                    onClick={() => updateField("has_created_agent_before", true)}
                    label="Yes, I have"
                  />
                  <OptionCard
                    selected={data.has_created_agent_before === false}
                    onClick={() => updateField("has_created_agent_before", false)}
                    label="No, I'm new"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">What's your experience level with AI tools?</p>
                <div className="space-y-1.5">
                  <OptionCard selected={data.experience_level === "beginner"} onClick={() => updateField("experience_level", "beginner")} icon={Sparkles} label="Beginner" description="I'm just getting started with AI" />
                  <OptionCard selected={data.experience_level === "intermediate"} onClick={() => updateField("experience_level", "intermediate")} icon={Target} label="Intermediate" description="I've used AI tools but want to learn more" />
                  <OptionCard selected={data.experience_level === "expert"} onClick={() => updateField("experience_level", "expert")} icon={Code} label="Expert" description="I build and deploy AI solutions regularly" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: About You */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">What best describes your role?</p>
                <div className="space-y-1.5">
                  <OptionCard selected={data.role_title === "business_owner"} onClick={() => updateField("role_title", "business_owner")} icon={Briefcase} label="Business Owner" description="I run my own company" />
                  <OptionCard selected={data.role_title === "developer"} onClick={() => updateField("role_title", "developer")} icon={Code} label="Developer / Engineer" description="I build software products" />
                  <OptionCard selected={data.role_title === "marketer"} onClick={() => updateField("role_title", "marketer")} icon={Megaphone} label="Marketer" description="I manage marketing campaigns" />
                  <OptionCard selected={data.role_title === "agency"} onClick={() => updateField("role_title", "agency")} icon={Users} label="Agency" description="I build solutions for clients" />
                  <OptionCard selected={data.role_title === "other"} onClick={() => updateField("role_title", "other")} icon={User} label="Other" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-white/70 mb-2">Company size?</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {["solo", "2-10", "11-50", "51-200", "200+"].map((size) => (
                    <OptionCard key={size} selected={data.company_size === size} onClick={() => updateField("company_size", size)} label={size === "solo" ? "Just me" : size} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Use Case */}
          {step === 2 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-white/70 mb-2">What will you primarily use Agenly for?</p>
              <OptionCard selected={data.primary_use_case === "customer_support"} onClick={() => updateField("primary_use_case", "customer_support")} icon={HeadphonesIcon} label="Customer Support" description="Automate customer service conversations" />
              <OptionCard selected={data.primary_use_case === "sales"} onClick={() => updateField("primary_use_case", "sales")} icon={TrendingUp} label="Sales & Lead Generation" description="Qualify leads and book meetings" />
              <OptionCard selected={data.primary_use_case === "internal_ops"} onClick={() => updateField("primary_use_case", "internal_ops")} icon={Cog} label="Internal Operations" description="Streamline internal processes" />
              <OptionCard selected={data.primary_use_case === "lead_generation"} onClick={() => updateField("primary_use_case", "lead_generation")} icon={Target} label="Lead Generation" description="Capture and nurture leads" />
              <OptionCard selected={data.primary_use_case === "other"} onClick={() => updateField("primary_use_case", "other")} icon={Sparkles} label="Something Else" />
            </div>
          )}

          {/* Step 4: Discovery */}
          {step === 3 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-white/70 mb-2">How did you hear about Agenly?</p>
              {[
                { value: "google", label: "Google Search" },
                { value: "social_media", label: "Social Media (Twitter, LinkedIn, etc.)" },
                { value: "friend_referral", label: "Friend / Colleague Referral" },
                { value: "blog_article", label: "Blog / Article" },
                { value: "youtube", label: "YouTube" },
                { value: "other", label: "Other" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={data.how_heard_about_us === opt.value}
                  onClick={() => updateField("how_heard_about_us", opt.value)}
                  label={opt.label}
                />
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canProceed() || loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Finishing...
                  </span>
                ) : (
                  <>Get Started <Sparkles size={14} /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip option */}
        <div className="text-center mt-3">
          <button
            onClick={handleFinish}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
