"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const headingText = "CREATE, TRAIN, AND DEPLOY AI AGENTS FROM ONE PLATFORM";
  const words = headingText.split(" ");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 800], [1, isMobile ? 1 : 0.9]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, isMobile ? 1 : 0.3]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative overflow-clip">
      <AnimatePresence>
        {!isPreloaderDone && (
          <Preloader key="preloader" onComplete={() => setIsPreloaderDone(true)} />
        )}
      </AnimatePresence>

      {/* Ambient Glow Orbs — hidden on mobile for performance */}
      <div className="hidden md:block absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* ─── Hero + Inner Navbar ─── */}
      <section className="sticky top-0 z-0 h-screen overflow-hidden" style={{ padding: "9px", paddingBottom: "12px" }}>
        <motion.div style={isMobile ? {} : { scale: heroScale, opacity: heroOpacity, transformOrigin: 'top' }} className="w-full h-full relative transform-gpu">
          {/* Top Center Cutout for Menu — desktop only */}
          {isPreloaderDone && (
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
              className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 bg-[#0A0A0B] rounded-b-[2rem] z-40 px-24 pt-5 pb-6 items-center justify-center">
              <svg className="absolute top-0 left-[-31px] w-8 h-8 text-[#0A0A0B] fill-current pointer-events-none" viewBox="0 0 24 24">
                <path d="M24 24C24 10.7452 13.2548 0 0 0H24V24Z" />
              </svg>
              <svg className="absolute top-0 right-[-31px] w-8 h-8 text-[#0A0A0B] fill-current pointer-events-none" viewBox="0 0 24 24">
                <path d="M 0 24 V 0 H 24 C 10.7452 0 0 10.7452 0 24 Z" />
              </svg>
              <div className="flex items-center gap-16">
                <a href="#benefits" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">BENEFITS</a>
                <a href="#features" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">FEATURES</a>
                <a href="#how-it-works" className="text-base font-bold text-white font-beras hover:text-[#A78BFA] transition-colors">HOW IT WORKS</a>
              </div>
            </motion.div>
          )}

          <div className="relative bg-white rounded-3xl sm:rounded-[2rem] w-full h-full overflow-hidden flex flex-col items-center pt-48 sm:pt-36 lg:pt-40 px-6 sm:px-10">

            {/* Inner Navbar */}
            {isPreloaderDone && (
              <motion.header
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                className="absolute top-0 left-0 right-0 w-full flex justify-between items-center z-30 px-6 sm:px-10 pt-5">
                <Link href="/" className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Agenly Logo" width={64} height={64} className="object-contain w-14 h-14 md:w-16 md:h-16" />
                  <span className="hidden md:inline text-xl font-bold text-[#0A0A0B] tracking-[0.2em]">AGENLY</span>
                </Link>

                {/* Desktop: SIGN IN button */}
                <Link
                  href="/login"
                  className="hidden md:inline-flex btn-3d-purple px-8 py-3 text-white text-base font-bold font-beras transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span className="relative z-10 drop-shadow-md">SIGN IN</span>
                </Link>

                {/* Mobile: Hamburger button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden w-10 h-10 rounded-xl bg-[#0A0A0B] flex items-center justify-center text-white shadow-lg"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
              </motion.header>
            )}

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[60] bg-black/50 md:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="fixed top-0 right-0 bottom-0 w-[280px] z-[70] bg-[#0A0A0B] shadow-2xl flex flex-col md:hidden"
                >
                  {/* Close button */}
                  <div className="flex justify-end p-5">
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
                      aria-label="Close menu"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Nav links */}
                  <nav className="flex flex-col gap-1 px-6 mt-4">
                    {[
                      { href: "#benefits", label: "BENEFITS" },
                      { href: "#features", label: "FEATURES" },
                      { href: "#how-it-works", label: "HOW IT WORKS" },
                    ].map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-bold text-white/80 font-beras tracking-widest py-4 border-b border-white/10 hover:text-[#A78BFA] transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>

                  {/* Sign In CTA */}
                  <div className="mt-auto p-6">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-3d-purple w-full flex items-center justify-center px-8 py-3.5 text-white text-base font-bold font-beras"
                    >
                      <span className="relative z-10 drop-shadow-md">SIGN IN</span>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-20">
              <div className="w-[500px] h-[500px] bg-[#7C3AED]/5 rounded-full blur-[150px]" />
            </div>

            <h1
              className="relative z-10 text-3xl sm:text-[2.5rem] lg:text-[3.25rem] xl:text-[3.75rem] font-extrabold leading-[1.05] tracking-tight text-center w-full max-w-[95vw] lg:max-w-none text-[#0A0A0B] font-beras flex flex-wrap justify-center gap-x-3 gap-y-2 sm:gap-x-4"
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
                  className="hidden sm:block w-full h-auto drop-shadow-[0_0_40px_rgba(124,58,237,0.15)]"
                  priority
                />
                <Image
                  src="/agenly-mobile.png"
                  alt="Agenly AI Platform"
                  width={600}
                  height={800}
                  className="sm:hidden w-full h-auto drop-shadow-[0_0_40px_rgba(124,58,237,0.15)]"
                  priority
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>


      {/* ─── Light Mode Content Wrapper ─── */}
      <div className="bg-[#fafafa] relative z-20 rounded-t-[2rem] sm:rounded-t-[3rem] md:rounded-t-[4rem] shadow-[0_-10px_30px_rgba(0,0,0,0.15)] md:shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">

        {/* ─── Benefits / About ─── */}
        <section id="benefits" className="relative z-10 py-16 sm:py-24 md:py-32 lg:py-40 px-6">
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
                const directions = [
                  { x: -120, y: -80 },
                  { x: 120, y: -80 },
                  { x: -120, y: 80 },
                  { x: 120, y: 80 },
                ];
                const dir = directions[i];
                return (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, x: dir.x, y: dir.y, scale: 0.85 }}
                    whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                    viewport={{ once: true, margin: "-50px" }}
                    className="w-full group select-none"
                  >
                    <div
                      className="h-full rounded-3xl border border-gray-200/80 bg-white p-3 transition-transform duration-300 group-hover:-translate-y-1"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)" }}
                    >
                      <div className="h-full rounded-[20px] border border-gray-100 bg-white p-8 sm:p-10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 to-purple-50/0 group-hover:from-purple-50/60 transition-colors duration-500 rounded-[20px] pointer-events-none" />

                        <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-white shadow-sm border border-gray-100 text-purple-600 group-hover:scale-110 transition-transform duration-500 ease-out">
                            <b.icon size={22} className="text-purple-600" />
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
        <section className="relative z-10 py-16 sm:py-24 md:py-32 lg:py-40 px-6 bg-[#fafafa]">
          <div className="max-w-4xl mx-auto relative">
            {/* Intense Outer Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-purple-500/20 rounded-[3rem] blur-2xl pointer-events-none" />

            <div className="relative bg-white rounded-[3rem] border border-gray-200 shadow-xl p-12 sm:p-20 text-center overflow-hidden">
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
        <footer className="relative z-10 border-t border-gray-800 py-8 px-6 bg-[#0A0A0B] text-white rounded-b-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Agenly" width={24} height={24} />
              <span className="text-xs font-bold text-white tracking-[0.15em]">AGENLY</span>
            </div>
            <a 
              href="https://www.arcai.agency" 
              target="_blank" 
              rel="noopener" 
              title="ARC AI - Web Design & Digital Solutions"
              className="text-[11px] text-gray-400 font-medium hover:text-white transition-colors flex items-center gap-2"
            >
              Designed & Developed by <img src="/arc-logo.png" alt="ARC AI - Web Design & Digital Solutions" className="h-7 sm:h-8 w-auto object-contain translate-y-[2px]" />
            </a>
            <p className="text-[11px] text-gray-400 font-medium text-center sm:text-left">© 2026 Agenly. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
