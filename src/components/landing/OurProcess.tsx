"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const processSteps = [
  {
    num: "01",
    title: "Sign up and create an agent",
    desc: "Pick a name, give it a personality, choose how it looks. You're done before your coffee gets cold.",
  },
  {
    num: "02",
    title: "Feed it your content",
    desc: "Upload files or point it at your website. It reads, understands, and remembers everything — automatically.",
  },
  {
    num: "03",
    title: "Paste one line of code",
    desc: "Copy. Paste. Your AI agent is live on your site, talking to customers right now.",
  },
];

export default function OurProcess() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 md:py-32 bg-[#fafafa] text-gray-900 relative z-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start relative">
        
        {/* Sticky Left Column */}
        <div className="lg:sticky lg:top-32 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-600 shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
            <h2 className="text-sm font-bold tracking-[0.2em] text-purple-600 uppercase">How it works</h2>
          </div>
          
          <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black font-beras tracking-tight leading-[1.1] text-gray-900">
            Three Steps.
            <br />
            Five Minutes.
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Live.</span>
          </h3>
          
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg font-medium">
            No onboarding calls. No setup guides. No waiting.
          </p>
          
          <div className="pt-6">
            <div className="relative inline-flex">
              <button disabled className="inline-flex items-center justify-center font-bold bg-white border border-gray-200 shadow-sm h-12 rounded-full px-8 text-base opacity-70 cursor-not-allowed">
                Start Building Free
              </button>
              <span className="absolute -top-2.5 -right-2.5 bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-700 shadow-xl z-20 whitespace-nowrap tracking-widest uppercase">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
        
        {/* Scrolling Right Column */}
        <div className="space-y-6">
          {processSteps.map((step) => (
            <div 
              key={step.num}
              className="group p-8 sm:p-10 rounded-3xl border border-gray-200/60 bg-white hover:border-purple-500/50 hover:shadow-[0_12px_30px_-15px_rgba(124,58,237,0.12)] transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle hover glow inside card */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/[0.03] transition-colors duration-500 pointer-events-none" />
              
              <span className="block text-gray-400 text-lg sm:text-xl font-bold mb-4 group-hover:text-purple-600 transition-colors duration-300 font-beras">
                {step.num}.
              </span>
              <h4 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors duration-300 tracking-tight">
                {step.title}
              </h4>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-medium">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
