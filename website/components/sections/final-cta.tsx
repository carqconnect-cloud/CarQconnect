"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCta() {
  return (
    <section 
      className="relative overflow-hidden section-py text-center flex flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, #A3B7FF 0%, #D2DCFF 40%, #F7F9FC 67%, #F7F9FC 100%)'
      }}
    >
      <motion.div 
        className="container-page relative flex flex-col items-center z-10 w-full"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 
          className="font-display font-extrabold text-[#0B1B3F] mx-auto" 
          style={{ 
            fontSize: 'clamp(34px, 5vw, 60px)', 
            lineHeight: 1.05, 
            letterSpacing: '-0.03em', 
            maxWidth: '820px' 
          }}
        >
          Make every vehicle smarter. Make every journey <span className="text-[#1769FF]">safer.</span>
        </h2>
        
        <motion.div 
          className="mt-10 flex flex-wrap items-center justify-center gap-[14px]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="#download"
            className="flex items-center justify-center bg-[#1769FF] text-white text-[clamp(12px,2vw,14px)] font-bold px-[clamp(18px,4vw,28px)] py-[clamp(11px,3vw,15px)] rounded-[10px] shadow-[0_8px_20px_rgba(23,105,255,0.28)] hover:brightness-[1.08] transition-all"
          >
            Download App
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center justify-center bg-transparent border-[1.5px] border-[#1769FF] text-[#1769FF] text-[clamp(12px,2vw,14px)] font-bold px-[clamp(18px,4vw,28px)] py-[clamp(11px,3vw,15px)] rounded-[10px] hover:bg-[rgba(23,105,255,0.08)] transition-all"
          >
            View Hardware
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
