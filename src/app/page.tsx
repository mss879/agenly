"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState } from "react";
import { MousePointerClick, BadgeDollarSign, Rocket, ShieldCheck } from "lucide-react";
import Preloader from "@/components/Preloader";
import AnimatedFeatures from "@/components/landing/AnimatedFeatures";
import OurProcess from "@/components/landing/OurProcess";
import Services from "@/components/landing/Services";




const benefits = [
  {
    title: "No Coding Required",
    desc: "Create powerful AI agents through an intuitive dashboard. No programming skills, no APIs, no headaches.",
    icon: MousePointerClick,
  },
  {
    title: "Save Thousands",
    desc: "Stop paying agencies $5,000+ per chatbot. Build unlimited AI agents yourself for a fraction of the cost.",
    icon: BadgeDollarSign,
  },
  {
    title: "Launch in Minutes",
    desc: "Go from idea to live AI agent in under 5 minutes. Upload docs, write a prompt, deploy — done.",
    icon: Rocket,
  },
  {
    title: "Your Data, Your Control",
    desc: "Full data isolation per agent. Your knowledge base, conversations, and analytics stay private and secure.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  const [isPreloaderDone, setIsPreloaderDone] = useState(false);
  const headingText = "CREATE, TRAIN, AND DEPLOY AI AGENTS FROM ONE PLATFORM";
  const words = headingText.split(" ");
  
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 800], [1, 0.9]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0.3]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative">
      <AnimatePresence>
        {!isPreloaderDone && (
          <Preloader key="preloader" onComplete={() => setIsPreloaderDone(true)} />
        )}
      </AnimatePresence>

      {/* Ambient Glow Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/15 rounded-full blur-[180px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/10 rounded-full blur-[180px] pointer-events-none" />

      {/* ─── Hero + Inner Navbar ─── */}
      <section className="sticky top-0 z-0 h-screen overflow-hidden" style={{ padding: "9px" }}>
        <motion.div style={{ scale: heroScale, opacity: heroOpacity, transformOrigin: 'top' }} className="w-full h-full relative">
        {/* Top Center Cutout for Menu */}
        {isPreloaderDone && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#0A0A0B] rounded-b-3xl sm:rounded-b-[2rem] z-40 px-20 sm:px-24 pt-5 pb-6 flex items-center justify-center">
            {/* Inverse curve (left edge blending into white container's top edge) */}
            <svg className="absolute top-0 left-[-31px] w-8 h-8 text-[#0A0A0B] fill-current pointer-events-none" viewBox="0 0 24 24">
              <path d="M24 24C24 10.7452 13.2548 0 0 0H24V24Z" />
            </svg>

            <svg className="absolute top-0 right-[-31px] w-8 h-8 text-[#0A0A0B] fill-current pointer-events-none" viewBox="0 0 24 24">
              <path d="M 0 24 V 0 H 24 C 10.7452 0 0 10.7452 0 24 Z" />
            </svg>

            <div className="hidden md:flex items-center gap-16">
              <a href="#benefits" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">BENEFITS</a>
              <a href="#features" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">FEATURES</a>
              <a href="#how-it-works" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">HOW IT WORKS</a>
            </div>
          </motion.div>
        )}

        <div className="relative bg-white rounded-3xl sm:rounded-[2rem] w-full h-full overflow-hidden flex flex-col items-center pt-28 sm:pt-36 lg:pt-40 px-6 sm:px-10">

          {/* Inner Navbar */}
          {isPreloaderDone && (
            <motion.header
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
              className="absolute top-0 left-0 right-0 w-full flex justify-between items-center z-30 px-6 sm:px-10 pt-5">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/logo.png" alt="Agenly Logo" width={64} height={64} className="object-contain" />
                <span className="text-xl font-bold text-[#0A0A0B] tracking-[0.2em]">AGENLY</span>
              </Link>

              <Link
                href="/login"
                className="btn-3d-purple px-8 py-3 text-white text-base font-bold font-beras transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="relative z-10 drop-shadow-md">SIGN IN</span>
              </Link>
            </motion.header>
          )}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-20">
            <div className="w-[500px] h-[500px] bg-[#7C3AED]/5 rounded-full blur-[150px]" />
          </div>

          <h1
            className="relative z-10 text-3xl sm:text-[2.5rem] lg:text-[3.25rem] xl:text-[3.75rem] font-extrabold leading-[1.05] tracking-tight text-center w-full max-w-[95vw] lg:max-w-none text-[#0A0A0B] font-beras flex flex-wrap justify-center gap-x-3 sm:gap-x-4"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.06)",
              transform: "perspective(800px) rotateX(2deg)",
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, rotateX: -15 }}
                animate={isPreloaderDone ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{
                  duration: 0.8,
                  delay: 0.3 + i * 0.1, // slower, smoother staggered reveal
                  ease: [0.25, 1, 0.5, 1],
                }}
                className="inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {isPreloaderDone && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.7 + words.length * 0.1, ease: [0.25, 1, 0.5, 1] }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[550px] z-20 translate-y-2 sm:translate-y-4">
              <Image
                src="/hero-img.png"
                alt="Agenly AI Platform"
                width={900}
                height={600}
                className="w-full h-auto drop-shadow-[0_0_40px_rgba(124,58,237,0.15)]"
                priority
              />
            </motion.div>
          )}
        </div>
        </motion.div>
      </section>


      {/* ─── Light Mode Content Wrapper ─── */}
      <div className="bg-[#fafafa] relative z-20 rounded-t-[3rem] sm:rounded-t-[4rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
        
        {/* ─── Benefits / About ─── */}
        <section id="benefits" className="relative z-10 py-32 sm:py-40 px-6">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.3em] mb-6">Why Agenly</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-beras uppercase tracking-wide leading-[1.1] text-gray-900">
                AI Agents Should Be
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">For Everyone</span>
              </h2>
              <p className="mt-6 text-base text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
                We&apos;re closing the gap between technical expertise and everyday business needs. You shouldn&apos;t need a developer or an expensive agency to give your website an intelligent AI assistant. Agenly puts the power in your hands.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              {benefits.map((b, i) => {
                // Each card flies in from a different corner
                const directions = [
                  { x: -120, y: -80 },   // top-left
                  { x: 120, y: -80 },    // top-right
                  { x: -120, y: 80 },    // bottom-left
                  { x: 120, y: 80 },     // bottom-right
                ];
                const dir = directions[i];
                return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, x: dir.x, y: dir.y, scale: 0.85 }}
                  whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="w-full shrink-0 group select-none"
                >
                  {/* Outer Glassmorphism Shell matching user snippet */}
                  <div 
                    className="h-full rounded-[36px] border border-white/60 p-3 transition-transform duration-300 group-hover:-translate-y-1 relative" 
                    style={{
                      background: "radial-gradient(92.09% 124.47% at 50% 99.24%, rgba(221, 226, 238, 0.40) 58.91%, rgba(187, 197, 221, 0.40) 100%)",
                      backdropFilter: "blur(20px) saturate(180%)",
                      boxShadow: "0 8px 32px 0 rgba(17, 24, 39, 0.12), 0 2px 8px 0 rgba(17, 24, 39, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)"
                    }}
                  >
                    {/* Top Highlight Line */}
                    <div className="pointer-events-none absolute top-[2px] left-[10%] right-[10%] h-[1px]" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)" }}></div>
                    {/* Diagonal Overlay */}
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: "linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0) 70%, rgba(255, 255, 255, 0.4) 100%)", mixBlendMode: "overlay" }}></div>
                    {/* Radial Soft Light */}
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 50%)", mixBlendMode: "soft-light" }}></div>
                    {/* Noise Texture */}
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.15]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")", mixBlendMode: "overlay" }}></div>
                    {/* Inner Shadows */}
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 0 rgba(255, 255, 255, 0.2), inset 1px 0 0 0 rgba(255, 255, 255, 0.3), inset -1px 0 0 0 rgba(255, 255, 255, 0.3)" }}></div>
                    
                    {/* Inner Card Body */}
                    <div 
                      className="h-full rounded-[32px] border border-white/70 bg-white/60 p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between" 
                      style={{ 
                        backdropFilter: "blur(24px) saturate(200%)", 
                        boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.05), 0 4px 16px rgba(124, 58, 237, 0.05)" 
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/[0.03] transition-colors duration-500 rounded-[32px] pointer-events-none" />

                      <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                        {/* Icon Container */}
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 text-purple-600 relative overflow-hidden group-hover:scale-110 transition-transform duration-500 ease-out">
                           <div className="absolute inset-[2px] rounded-[14px] bg-gradient-to-br from-purple-50 to-white" />
                           <motion.div
                             className="relative z-10"
                             whileHover={{ rotate: [0, -10, 10, 0] }}
                             transition={{ duration: 0.5 }}
                           >
                             <b.icon size={22} className="text-purple-600 drop-shadow-[0_0_6px_rgba(124,58,237,0.4)]" />
                           </motion.div>
                        </div>

                        <div className="flex-1 mt-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 tracking-tight">{b.title}</h3>
                          <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-medium">{b.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </div>
        </section>

      {/* ─── Animated Features ─── */}
      <AnimatedFeatures />

      {/* ─── Our Process ─── */}
      <OurProcess />

      {/* ─── Services ─── */}
      <Services />

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-32 sm:py-40 px-6 bg-[#fafafa]">
        <div className="max-w-4xl mx-auto relative">
          {/* Intense Outer Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-purple-500/20 rounded-[3rem] blur-2xl pointer-events-none" />

          <div className="relative bg-white/80 backdrop-blur-3xl rounded-[3rem] border border-gray-200 shadow-xl p-12 sm:p-20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent pointer-events-none" />

            <h2 className="relative z-10 text-3xl sm:text-4xl lg:text-6xl font-black font-beras uppercase tracking-wide leading-[1.1] mb-6 text-gray-900">
              Stop Overpaying.
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Start Building.</span>
            </h2>
            <p className="relative z-10 text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-10 font-medium leading-relaxed">
              Your competitors are already using AI. Don&apos;t get left behind. Create your first agent today — no code, no credit card, no catch.
            </p>

            <Link
              href="/login"
              className="relative z-10 btn-3d-purple inline-flex items-center justify-center px-10 py-4 text-white text-base lg:text-lg font-bold font-beras uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <span className="relative z-10 drop-shadow-md">Get Started Free →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-gray-200 py-8 px-6 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Agenly" width={24} height={24} className="brightness-0" />
            <span className="text-xs font-bold text-gray-400 tracking-[0.15em]">AGENLY</span>
          </div>
          <a href="https://www.arcai.agency" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 font-medium hover:text-purple-600 transition-colors">
            Designed by ARC AI
          </a>
          <p className="text-[11px] text-gray-400 font-medium">© 2026 Agenly. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </div>
  );
}
