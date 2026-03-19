"use client";
import { motion, useInView } from "framer-motion";
import { useState, useEffect, useRef, memo } from "react";
import { FileText, UploadCloud, CheckCircle2, Bot, Sparkles, Send, Copy, AlertCircle, MousePointer2 } from "lucide-react";

const TypeWords = memo(({ text, start, end, className, cursorStart, cursorEnd }: { text: string, start: number, end: number, className?: string, cursorStart?: number, cursorEnd?: number }) => {
  const words = text.split(" ");
  const duration = end - start;
  const step = duration / words.length;

  return (
    <span className={className}>
      {words.map((word, i) => {
        const appearTime = start + i * step;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{
              duration: 12,
              times: [0, appearTime - 0.0001, appearTime, 0.90, 0.95],
              repeat: Infinity
            }}
            className="inline"
            style={{ }}
          >
            {word}{" "}
          </motion.span>
        );
      })}
      {cursorStart !== undefined && cursorEnd !== undefined && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 12, times: [0, cursorStart - 0.0001, cursorStart, cursorEnd, cursorEnd + 0.0001], repeat: Infinity }}
          className="inline-block"
          style={{ }}
        >
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="inline-block w-[2px] h-[1.2em] bg-indigo-500 ml-0.5 align-middle relative top-[-1px]"
          />
        </motion.span>
      )}
    </span>
  );
});
TypeWords.displayName = "TypeWords";

// Feature 1: Agent Settings Mockup High-End Animation
const AgentSettingsMockup = () => {
  // Animation Timing Breakdown (12s total):
  // 0.00 - 0.03: Pause
  // 0.03 - 0.16: Cursor blink then Type Agent Name
  // 0.16 - 0.36: Cursor blink then Type System Prompt
  // 0.36 - 0.48: Cursor blink then Type Welcome Message
  // 0.48 - 0.52: Scroll Down to button
  // 0.54 - 0.56: Click Save Button
  // 0.60 - 0.85: Show Success Toast
  // 0.85 - 0.90: Scroll Up & Reset

  return (
    <div className="w-full h-full min-h-[520px] flex items-center justify-center bg-gray-50/50 relative overflow-visible group">

      {/* Central UI Card */}
      <div className="w-full max-w-[340px] h-[400px] bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-gray-200/80 flex flex-col relative z-10 overflow-hidden transform-gpu group-hover:shadow-[0_40px_100px_-20px_rgba(124,58,237,0.2)] transition-shadow duration-700" style={{ willChange: "transform" }}>

        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />

        {/* Sticky Header */}
        <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-5 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0A0A0B] to-gray-800 rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 leading-tight">Agent Profile</h4>
              <p className="text-[10px] font-medium tracking-wide text-gray-500">ID: ag_902xyz</p>
            </div>
          </div>
          <motion.div
            animate={{
              backgroundColor: ["#f3f4f6", "#dcfce7", "#dcfce7", "#f3f4f6"],
              color: ["#9ca3af", "#15803d", "#15803d", "#9ca3af"]
            }}
            transition={{ duration: 12, times: [0, 0.56, 0.85, 0.90], repeat: Infinity }}
            className="text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest h-5 overflow-hidden w-[64px] relative"
          >
            <motion.span
              animate={{ y: [0, 0, -20, -20, 0] }}
              transition={{ duration: 12, times: [0, 0.55, 0.56, 0.85, 0.90], repeat: Infinity }}
              className="absolute left-0 w-full text-center"
            >
              Draft
            </motion.span>
            <motion.span
              animate={{ y: [20, 20, 0, 0, 20] }}
              transition={{ duration: 12, times: [0, 0.55, 0.56, 0.85, 0.90], repeat: Infinity }}
              className="absolute left-0 w-full text-center"
            >
              Active
            </motion.span>
          </motion.div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-hidden relative bg-[#fafafa]">
          <motion.div
            animate={{ y: [0, 0, -90, -90, 0, 0] }}
            transition={{ duration: 12, times: [0, 0.48, 0.52, 0.85, 0.90, 1], repeat: Infinity, ease: "easeInOut" }}
            className="p-5 flex flex-col gap-6"
          >

            {/* Form Fields */}
            <div className="space-y-4">

              {/* Agent Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Agent Name</label>
                <div className="h-10 w-full bg-white border border-gray-200 rounded-xl px-3 flex items-center shadow-sm relative">
                  <TypeWords
                    text="Customer Service Agent"
                    start={0.06}
                    end={0.14}
                    className="text-xs font-semibold text-gray-900"
                    cursorStart={0.03}
                    cursorEnd={0.16}
                  />
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">System Prompt</label>
                <div className="h-28 w-full bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 overflow-hidden shadow-inner flex flex-col items-start relative">
                  <TypeWords
                    text="You are a top-tier customer success agent for an enterprise SaaS. Resolve queries using the uploaded knowledge base. Be empathetic, concise, and incredibly sharp. Always ask if they need further technical details."
                    start={0.19}
                    end={0.34}
                    className="text-[10px] text-indigo-900 font-mono leading-[1.6]"
                    cursorStart={0.16}
                    cursorEnd={0.36}
                  />
                  <motion.div
                    animate={{ opacity: [0, 0, 1, 1, 0] }}
                    transition={{ duration: 12, times: [0, 0.35, 0.36, 0.90, 0.95], repeat: Infinity }}
                    className="absolute bottom-3 left-3 flex items-center gap-1 bg-indigo-100 text-indigo-700 font-bold text-[8px] px-2 py-0.5 rounded tracking-wide uppercase"
                  >
                    <Sparkles size={8} /> Optimized
                  </motion.div>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">Welcome Message</label>
                <div className="h-10 w-full bg-white border border-gray-200 rounded-xl px-3 flex items-center shadow-sm relative">
                  <TypeWords
                    text="Hi! How can our team assist you?"
                    start={0.39}
                    end={0.46}
                    className="text-xs text-gray-900"
                    cursorStart={0.36}
                    cursorEnd={0.48}
                  />
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div className="pt-4 mt-2 border-t border-gray-200/60 flex justify-end">
              <motion.button
                animate={{
                  scale: [1, 1, 1, 0.95, 1, 1, 1, 1],
                  background: ["#e5e7eb", "#e5e7eb", "#4f46e5", "#4f46e5", "#4f46e5", "#4f46e5", "#e5e7eb", "#e5e7eb"],
                  color: ["#9ca3af", "#9ca3af", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#9ca3af", "#9ca3af"],
                  boxShadow: ["none", "none", "0 10px 20px -5px rgba(124,58,237,0.4)", "0 10px 20px -5px rgba(124,58,237,0.4)", "0 10px 20px -5px rgba(124,58,237,0.4)", "0 10px 20px -5px rgba(124,58,237,0.4)", "none", "none"]
                }}
                transition={{ duration: 12, times: [0, 0.48, 0.49, 0.54, 0.56, 0.85, 0.90, 1], repeat: Infinity }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center w-full sm:w-[150px] overflow-hidden"
              >
                <div className="relative w-full h-full flex items-center justify-center min-h-[20px]">
                  <motion.span
                    animate={{ opacity: [1, 1, 1, 1, 0, 0, 1, 1] }}
                    transition={{ duration: 12, times: [0, 0.48, 0.49, 0.54, 0.55, 0.85, 0.90, 1], repeat: Infinity }}
                    className="absolute"
                  >
                    Save Config
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0, 0, 0, 0, 1, 1, 0, 0] }}
                    transition={{ duration: 12, times: [0, 0.48, 0.49, 0.54, 0.55, 0.85, 0.90, 1], repeat: Infinity }}
                    className="absolute flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <CheckCircle2 size={12} className="opacity-90" /> Saved Config
                  </motion.span>
                </div>
              </motion.button>
            </div>

          </motion.div>
        </div>

        {/* Success Toast */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1, 0, 0], y: [20, 20, 0, 0, 20, 20] }}
          transition={{ duration: 12, times: [0, 0.60, 0.62, 0.83, 0.85, 1], repeat: Infinity, ease: "easeOut" }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl z-50 whitespace-nowrap border border-gray-700 pointer-events-none"
        >
          <CheckCircle2 size={16} className="text-green-400" />
          Agent Saved
        </motion.div>

      </div>
    </div>
  );
};


// Feature 2: Knowledge Base Mockup
const KnowledgeMockup = () => (
  <div className="w-full h-full min-h-[520px] p-4 sm:p-8 flex items-center justify-center bg-gray-50/50 relative overflow-hidden group">
    <div className="w-full max-w-[340px] bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-gray-200/80 p-6 flex flex-col gap-4 relative z-10 text-left">
      
      {/* Header */}
      <div className="text-center space-y-1 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-purple-200">
          <UploadCloud size={20} className="text-white" />
        </div>
        <h4 className="text-sm font-bold text-gray-900 mt-3">Knowledge Base</h4>
        <p className="text-[10px] text-gray-500 font-medium">Drag & drop files or paste a URL</p>
      </div>

      {/* Drop Zone */}
      <motion.div
        animate={{ 
          borderColor: ["#e5e7eb", "#e5e7eb", "#a855f7", "#e5e7eb", "#e5e7eb", "#a855f7", "#e5e7eb", "#e5e7eb"],
          backgroundColor: ["rgba(249,250,251,0.5)", "rgba(249,250,251,0.5)", "rgba(168,85,247,0.05)", "rgba(249,250,251,0.5)", "rgba(249,250,251,0.5)", "rgba(168,85,247,0.05)", "rgba(249,250,251,0.5)", "rgba(249,250,251,0.5)"]
        }}
        transition={{ duration: 10, times: [0, 0.12, 0.18, 0.25, 0.57, 0.63, 0.7, 1], repeat: Infinity }}
        className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 relative"
      >
        <motion.div animate={{ scale: [1, 1, 1.2, 1, 1, 1.2, 1, 1] }} transition={{ duration: 10, times: [0, 0.12, 0.18, 0.25, 0.57, 0.63, 0.7, 1], repeat: Infinity }}>
          <UploadCloud size={28} className="text-purple-400" />
        </motion.div>
        <p className="text-[10px] text-gray-500 font-semibold">Drop files here</p>
      </motion.div>

      {/* List */}
      <div className="flex flex-col gap-2 min-h-[110px]">
        {/* File 1: Product Guide */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1, 0, 0], y: [10, 10, 0, 0, 10, 10] }}
          transition={{ duration: 10, times: [0, 0.18, 0.22, 0.9, 0.95, 1], repeat: Infinity }}
          className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
        >
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
               <FileText size={14} className="text-purple-600" />
             </div>
             <div>
               <p className="text-xs font-bold text-gray-900">Product Guide.pdf</p>
               <p className="text-[9px] text-gray-400">2.4 MB</p>
             </div>
           </div>
           
           {/* Status Badge */}
           <div className="relative w-[76px] h-[24px]">
             {/* Processing... */}
             <motion.span 
               animate={{ opacity: [1, 1, 0, 0, 0, 0, 0], scale: [1, 1, 0.8, 0.8, 0.8, 0.8, 0.8] }}
               transition={{ duration: 10, times: [0, 0.35, 0.37, 0.55, 0.57, 0.9, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100"
             >
               <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                Processing
               </motion.span>
             </motion.span>
             {/* Processed */}
             <motion.span 
               animate={{ opacity: [0, 0, 1, 1, 0, 0, 0], scale: [0.8, 0.8, 1, 1, 0.8, 0.8, 0.8] }}
               transition={{ duration: 10, times: [0, 0.35, 0.37, 0.55, 0.57, 0.9, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center gap-1 text-[9px] font-bold rounded-full bg-green-50 text-green-600 border border-green-100"
             >
               <CheckCircle2 size={10} /> Processed
             </motion.span>
             {/* Ingesting... */}
             <motion.span 
               animate={{ opacity: [0, 0, 0, 0, 1, 1, 0], scale: [0.8, 0.8, 0.8, 0.8, 1, 1, 0.8] }}
               transition={{ duration: 10, times: [0, 0.35, 0.37, 0.55, 0.57, 0.95, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center text-[9px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-100"
             >
               <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                Ingesting
               </motion.span>
             </motion.span>
           </div>
        </motion.div>

        {/* File 2: FAQ Database */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1, 0, 0], y: [10, 10, 0, 0, 10, 10] }}
          transition={{ duration: 10, times: [0, 0.63, 0.67, 0.9, 0.95, 1], repeat: Infinity }}
          className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
        >
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
               <FileText size={14} className="text-purple-600" />
             </div>
             <div>
               <p className="text-xs font-bold text-gray-900">FAQ Database.csv</p>
               <p className="text-[9px] text-gray-400">1.8 MB</p>
             </div>
           </div>
           
           {/* Status Badge */}
           <div className="relative w-[76px] h-[24px]">
             {/* Processing... */}
             <motion.span 
               animate={{ opacity: [1, 1, 0, 0, 0, 0, 0], scale: [1, 1, 0.8, 0.8, 0.8, 0.8, 0.8] }}
               transition={{ duration: 10, times: [0, 0.74, 0.76, 0.82, 0.84, 0.96, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100"
             >
               <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                Processing
               </motion.span>
             </motion.span>
             {/* Processed */}
             <motion.span 
               animate={{ opacity: [0, 0, 1, 1, 0, 0, 0], scale: [0.8, 0.8, 1, 1, 0.8, 0.8, 0.8] }}
               transition={{ duration: 10, times: [0, 0.74, 0.76, 0.82, 0.84, 0.96, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center gap-1 text-[9px] font-bold rounded-full bg-green-50 text-green-600 border border-green-100"
             >
               <CheckCircle2 size={10} /> Processed
             </motion.span>
             {/* Ingesting... */}
             <motion.span 
               animate={{ opacity: [0, 0, 0, 0, 1, 1, 0], scale: [0.8, 0.8, 0.8, 0.8, 1, 1, 0.8] }}
               transition={{ duration: 10, times: [0, 0.74, 0.76, 0.82, 0.84, 0.95, 1], repeat: Infinity }}
               className="absolute inset-0 flex items-center justify-center text-[9px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-100"
             >
               <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                Ingesting
               </motion.span>
             </motion.span>
           </div>
        </motion.div>
      </div>
    </div>

    {/* Floating Dragging Elements */}
    {/* Element 1 */}
    <motion.div
      animate={{ 
        x: [180, 180, 0, 0, 180],
        y: [-250, -250, -110, -110, -250],
        opacity: [0, 1, 1, 0, 0],
        scale: [1, 1, 1, 0.5, 0.5]
      }}
      transition={{ duration: 10, times: [0, 0.02, 0.15, 0.2, 1], repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-1/2 left-1/2 z-50 flex flex-col items-center pointer-events-none origin-bottom-right transform-gpu"
      style={{ }}
    >
      <div className="bg-white p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-purple-200/60 flex flex-col items-center gap-2 transform -rotate-6 translate-x-[-50%] translate-y-[-50%]">
        <FileText size={28} className="text-purple-600" />
        <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Product<br/>Guide.pdf</span>
      </div>
      <div className="absolute -bottom-8 -right-6 text-gray-900 drop-shadow-md">
        <MousePointer2 className="fill-black" size={28} />
      </div>
    </motion.div>

    {/* Element 2 */}
    <motion.div
      animate={{ 
        x: [-200, -200, 0, 0, -200],
        y: [150, 150, -110, -110, 150],
        opacity: [0, 0, 1, 1, 0, 0],
        scale: [1, 1, 1, 1, 0.5, 0.5]
      }}
      transition={{ duration: 10, times: [0, 0.45, 0.47, 0.6, 0.65, 1], repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-1/2 left-1/2 z-50 flex flex-col items-center pointer-events-none origin-bottom-right transform-gpu"
      style={{ }}
    >
      <div className="bg-white p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-indigo-200/60 flex flex-col items-center gap-2 transform rotate-6 translate-x-[-50%] translate-y-[-50%]">
        <FileText size={28} className="text-indigo-600" />
        <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">FAQ<br/>Database.csv</span>
      </div>
      <div className="absolute -bottom-8 -right-6 text-gray-900 drop-shadow-md">
        <MousePointer2 className="fill-black" size={28} />
      </div>
    </motion.div>

  </div>
);

// Feature 3: Deploy Widget Mockup
const DeployMockup = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["Next.js", "Shopify", "WordPress"];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
  <div className="w-full h-full p-4 sm:p-8 flex items-center justify-center bg-gray-50/50">
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col gap-4">
      <div className="text-center space-y-1 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-green-200">
          <Send size={18} className="text-white" />
        </div>
        <h4 className="text-sm font-bold text-gray-900 mt-3">Deploy & Integrate</h4>
        <p className="text-[10px] text-gray-500 font-medium">Embed anywhere with a single snippet</p>
      </div>

      <div className="relative group/code mt-2">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 relative z-20">
          {tabs.map((tab, i) => (
            <motion.div
              key={tab}
              animate={{
                backgroundColor: activeTab === i ? "#4f46e5" : "#f3f4f6",
                color: activeTab === i ? "#ffffff" : "#9ca3af",
                scale: activeTab === i ? 1.05 : 1,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 py-1.5 rounded-md text-[9px] font-bold text-center tracking-wide"
            >
              {tab}
            </motion.div>
          ))}
        </div>

        {/* Code Snippet Area */}
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-[9px] sm:text-[10px] text-green-400 leading-relaxed overflow-hidden shadow-inner h-[140px] relative">
          
          {/* Next.js Snippet */}
          <motion.div
            animate={{ opacity: activeTab === 0 ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 p-4"
            style={{ zIndex: activeTab === 0 ? 10 : 0 }}
          >
            <span className="text-gray-500">{`// In your layout.tsx or page.tsx`}</span><br />
            <span className="text-purple-400">import</span> Script <span className="text-purple-400">from</span> <span className="text-amber-300">"next/script"</span>;<br /><br />
            <span className="text-purple-400">{'<Script'}</span><br />
            <span className="text-blue-400">  src</span>=<span className="text-amber-300">{`"https://agents.site/loader.js"`}</span><br />
            <span className="text-blue-400">  data-key</span>=<span className="text-amber-300">{`"dk_live_98x"`}</span><br />
            <span className="text-purple-400">{`/>`}</span>
          </motion.div>

          {/* Shopify Snippet */}
          <motion.div
             animate={{ opacity: activeTab === 1 ? 1 : 0 }}
             transition={{ duration: 0.3 }}
             className="absolute inset-0 p-4"
             style={{ zIndex: activeTab === 1 ? 10 : 0 }}
          >
            <span className="text-gray-500">{`<!-- Paste in Custom Liquid -->`}</span><br />
            <span className="text-gray-500">{`<!-- Just before </body> -->`}</span><br /><br />
            <span className="text-purple-400">{`<script `}</span><br />
            <span className="text-blue-400">  src</span>=<span className="text-amber-300">{`"https://agents.site/loader.js"`}</span><br />
            <span className="text-blue-400">  data-key</span>=<span className="text-amber-300">{`"dk_live_98x"`}</span><br />
            <span className="text-blue-400">  async</span><br />
            <span className="text-purple-400">{`></script>`}</span>
          </motion.div>

          {/* WordPress Snippet */}
          <motion.div
             animate={{ opacity: activeTab === 2 ? 1 : 0 }}
             transition={{ duration: 0.3 }}
             className="absolute inset-0 p-4"
             style={{ zIndex: activeTab === 2 ? 10 : 0 }}
          >
            <span className="text-gray-500">{`<!-- Add to footer.php -->`}</span><br />
            <span className="text-gray-500">{`<!-- Or via Header/Footer plugin -->`}</span><br /><br />
            <span className="text-purple-400">{`<script `}</span><br />
            <span className="text-blue-400">  src</span>=<span className="text-amber-300">{`"https://agents.site/loader.js"`}</span><br />
            <span className="text-blue-400">  data-key</span>=<span className="text-amber-300">{`"dk_live_98x"`}</span><br />
            <span className="text-blue-400">  async</span><br />
            <span className="text-purple-400">{`></script>`}</span>
          </motion.div>

        </div>
        
        {/* Copy Button */}
        <button className="absolute top-[60px] right-3 bg-white/10 text-white p-1.5 rounded-lg backdrop-blur hover:bg-white/20 z-30">
          <Copy size={12} />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        viewport={{ once: false }}
        className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-3"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <CheckCircle2 size={14} className="text-purple-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-purple-900">Widget Active</p>
          <p className="text-[9px] text-purple-600 font-medium">Deployed on 3 domains</p>
        </div>
      </motion.div>

      <div className="mt-2 flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <p className="text-[10px] font-medium leading-snug">Works instantly on WordPress, Webflow, Shopify, Framer, and custom sites.</p>
      </div>
    </div>
  </div>
  );
};

// Wrapper: only mount the Mockup when it first enters the viewport
const InViewMockup = ({ Mockup }: { Mockup: React.ComponentType }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5, margin: "-15% 0px -15% 0px" });

  return (
    <div
      ref={ref}
      className="w-full lg:w-1/2 relative bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 overflow-visible flex flex-col group-hover:shadow-[0_12px_30px_rgb(124,58,237,0.08)] group-hover:-translate-y-1 transition-all duration-300 transform-gpu"
    >
      <div className="flex flex-1 w-full bg-gray-50/50 relative">
        {isInView && <Mockup />}
      </div>
    </div>
  );
};

const features = [
  {
    title: "Custom AI Agents",
    desc: "Create agents with custom system prompts, welcome messages, and personalities. Choose from cutting-edge AI models. Each agent is fully isolated with its own configuration.",
    Mockup: AgentSettingsMockup,
    tag: "Agent Builder",
  },
  {
    title: "Smart Knowledge Base",
    desc: "Drag-and-drop PDFs, docs, and text files — or paste a URL to automatically crawl an entire website. Your agent instantly learns from all sources with RAG-powered retrieval.",
    Mockup: KnowledgeMockup,
    tag: "Knowledge RAG",
  },
  {
    title: "1-Click Deployment",
    desc: "Deploy your agent perfectly to Next.js, Shopify, WordPress, or any HTML site instantly. Generates optimized embed codes dynamically with specific instructions for every framework.",
    Mockup: DeployMockup,
    tag: "Seamless Integration",
  },
];

export default function AnimatedFeatures() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section id="features" className="relative z-10 py-20 md:py-32 sm:py-40 px-6 bg-white overflow-hidden">
      {/* Decorative — hidden on mobile */}
      <div className="hidden md:block absolute top-1/4 left-[-10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-1/4 right-[-10%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 lg:mb-32">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.3em] mb-6">Features</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black font-beras tracking-tight text-gray-900 leading-[1.1]">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Ship AI Agents</span>
          </h2>
        </div>

        <div className="space-y-16 lg:space-y-32">
          {features.map((f, i) => (
            <div key={f.title} className="group relative">
              <div className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 md:gap-12 lg:gap-20 relative z-10`}>

                {/* Visual / Mockup Side — desktop only for performance */}
                {!isMobile && <InViewMockup Mockup={f.Mockup} />}

                {/* Text Side */}
                <div className={`w-full ${isMobile ? '' : 'lg:w-1/2'} flex flex-col justify-center`}>
                  <div className="mb-4 md:mb-6 inline-flex">
                    <span className="px-5 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-xs sm:text-sm font-bold text-purple-600 uppercase tracking-[0.15em] hover:border-purple-300 transition-colors">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4 md:mb-6 tracking-tight leading-[1.1]">{f.title}</h3>
                  <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed max-w-lg">{f.desc}</p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
