"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// 1. Organic Spring Physics for Nodes
const drawNode = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: i * 0.4, type: "spring" as const, stiffness: 200, damping: 15 },
  }),
};

// 2. Flowing Particle Data Streams (Horizontal Left to Right)
const drawLine = {
  hidden: { pathLength: 0, opacity: 0, strokeDashoffset: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    strokeDashoffset: -24, // Flows left to right
    transition: {
      pathLength: { delay: i * 0.4 + 0.3, type: "spring" as const, stiffness: 80, damping: 20 },
      opacity: { delay: i * 0.4 + 0.3, duration: 0.2 },
      strokeDashoffset: { delay: i * 0.4 + 0.3, duration: 1.5, ease: "linear" as const, repeat: Infinity },
    },
  }),
};

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    // Sequence needs ~4s to draw linearly across
    const timer = setTimeout(() => {
      onComplete();
      setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = "auto";
      }, 1200); 
    }, 4200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0A0A0B] flex items-center justify-center overflow-hidden"
      initial={{ y: 0 }}
      animate={{ y: 0 }} 
      exit={{ y: "-100%" }}
      transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }} 
    >
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <div className="w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#7C3AED]/12 rounded-full blur-[100px]" />
      </motion.div>

      <div className="relative z-10 w-full max-w-3xl md:max-w-4xl lg:max-w-5xl px-6 flex flex-col items-center justify-center">
        
        {/* Horizontal Pipeline SVG (ViewBox adjusted for width) */}
        <motion.svg 
          viewBox="0 0 600 200" 
          className="w-full drop-shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          animate={{ opacity: [1, 1, 0.4] }}
          transition={{ times: [0, 0.8, 1], duration: 4.2, ease: "easeOut" }}
        >
          
          {/* Horizontal Data Streams */}
          {/* Create -> Train */}
          <motion.line x1="80" y1="100" x2="180" y2="100" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" custom={0} variants={drawLine} initial="hidden" animate="visible" />
          {/* Train -> Deploy */}
          <motion.line x1="220" y1="100" x2="320" y2="100" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" custom={1} variants={drawLine} initial="hidden" animate="visible" />
          {/* Deploy -> Agent */}
          <motion.line x1="360" y1="100" x2="470" y2="100" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 8" strokeLinecap="round" custom={2} variants={drawLine} initial="hidden" animate="visible" />
          
          {/* Sequence Nodes */}
          {/* 1. Create */}
          <motion.circle cx="60" cy="100" r="8" fill="#D8B4FE" custom={0} variants={drawNode} initial="hidden" animate="visible" />
          <motion.text x="60" y="140" fill="#A78BFA" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="3" className="font-beras" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.2, duration: 1 }}>CREATE</motion.text>
          
          {/* 2. Train */}
          <motion.circle cx="200" cy="100" r="8" fill="#D8B4FE" custom={1} variants={drawNode} initial="hidden" animate="visible" />
          <motion.text x="200" y="140" fill="#A78BFA" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="3" className="font-beras" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.6, duration: 1 }}>TRAIN</motion.text>
          
          {/* 3. Deploy */}
          <motion.circle cx="340" cy="100" r="8" fill="#D8B4FE" custom={2} variants={drawNode} initial="hidden" animate="visible" />
          <motion.text x="340" y="140" fill="#A78BFA" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="3" className="font-beras" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 1.0, duration: 1 }}>DEPLOY</motion.text>

          {/* 4. The Final Agent Core */}
          <motion.circle 
            cx="510" cy="100" r="28" 
            fill="#7C3AED" 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.6, type: "spring", stiffness: 150, damping: 10 }}
          />
          {/* Agent Shockwave */}
          <motion.circle 
            cx="510" cy="100" r="28" 
            fill="transparent" 
            stroke="#C084FC" 
            strokeWidth="3"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2], opacity: [0, 1, 0] }}
            transition={{ delay: 1.6, duration: 1.5, ease: "easeOut" }}
          />

          <motion.text 
            x="510" y="104" 
            fill="#fff" 
            fontSize="10" 
            fontWeight="bold" 
            textAnchor="middle" 
            letterSpacing="2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8, duration: 0.5, type: "spring" }}
            className="font-beras"
          >
            AGENT
          </motion.text>
        </motion.svg>

        {/* Cinematic Typography Mask Reveal for Brand */}
        <div className="flex flex-col items-center mt-8">
          <div className="overflow-hidden pb-1">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-black font-beras text-white tracking-[0.3em] ml-[0.3em] drop-shadow-[0_0_40px_rgba(124,58,237,0.6)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ delay: 2.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }} 
            >
              AGENLY
            </motion.h1>
          </div>
          
          <motion.div 
            className="h-[2px] bg-white rounded-full mt-5 origin-center shadow-[0_0_15px_rgba(255,255,255,0.8)]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 3.2, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
          />
        </div>

      </div>
    </motion.div>
  );
}
