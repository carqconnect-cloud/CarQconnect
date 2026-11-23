"use client";

import Link from "next/link";
import { Check, X, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const rows = [
  ["Public QR safety page", true, false],
  ["Masked owner contact", true, false],
  ["Live location and trip history", false, true],
  ["Geofence and movement alerts", false, true],
];

export function ProductComparison() {
  return (
    <section id="compare" className="bg-[#F7F9FC] section-py">
      <div className="container-page">
        
        {/* Heading Area */}
        <motion.div 
          className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
              <div className="w-8 h-[2px] bg-[#1769FF]" />
              <p className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                CHOOSE YOUR SETUP
              </p>
            </div>
            <h2 
              className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5" 
              style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.12, letterSpacing: '-0.025em' }}
            >
              Start simple. Add what matters.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-[#56637F] max-w-xl">
              Buy and activate in the carQconnect app. Use this guide to decide which setup fits your vehicle.
            </p>
          </div>
          <Link href="/marketplace" className="group shrink-0 self-start md:self-auto inline-flex items-center gap-1.5 text-[13px] md:text-[14px] font-semibold text-[#0B1B3F] border-b-[2px] border-[#1769FF] pb-1 hover:text-[#1769FF] transition-colors">
            Explore all hardware 
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" />
          </Link>
        </motion.div>

        {/* Table Container */}
        <motion.div 
          className="mt-[var(--block-gap)] rounded-[20px] border border-[rgba(23,105,255,0.16)] bg-white shadow-[0_10px_30px_rgba(23,105,255,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="min-w-[600px]">
              
              {/* Header */}
              <div 
                className="grid grid-cols-[50%_25%_25%] border-b border-[rgba(23,105,255,0.16)] text-[#0B1B3F]"
                style={{ background: 'linear-gradient(180deg, #D2DCFF 0%, #F7F9FC 100%)' }}
              >
                <div className="p-6 sm:p-8 flex items-end pb-8 text-[12px] font-bold text-[#1769FF] tracking-[0.14em] uppercase">
                  COMPARE FEATURES
                </div>
                
                <div className="p-6 sm:p-8 border-l border-[rgba(23,105,255,0.16)] flex flex-col items-start justify-end text-left">
                  <p className="font-display text-[20px] font-bold text-[#0B1B3F] leading-tight">QR Safety Tag</p>
                  <p className="mt-1.5 text-[13px] text-[#56637F]">For everyday public contact</p>
                </div>

                <div className="p-6 sm:p-8 border-l border-[rgba(23,105,255,0.16)] flex flex-col items-start justify-end text-left">
                  <p className="font-display text-[20px] font-bold text-[#0B1B3F] leading-tight">GPS Tracker</p>
                  <p className="mt-1.5 text-[13px] text-[#56637F]">For movement visibility</p>
                </div>
              </div>

              {/* Body Rows */}
              <div className="flex flex-col">
                {rows.map(([feature, qr, gps], i) => (
                  <div key={i} className={`grid grid-cols-[50%_25%_25%] min-h-[56px] transition-colors hover:bg-[rgba(23,105,255,0.04)] ${i !== rows.length - 1 ? "border-b border-[rgba(23,105,255,0.16)]" : ""}`}>
                    <div className="px-6 sm:px-8 py-4 text-[15px] font-semibold text-[#0B1B3F] flex items-center">
                      {feature}
                    </div>
                    <div className="flex items-center justify-center border-l border-[rgba(23,105,255,0.16)] px-4 py-4">
                      {qr ? (
                        <Check className="w-[18px] h-[18px] text-[#1769FF]" strokeWidth={3} />
                      ) : (
                        <X className="w-[18px] h-[18px] text-[#9AA0AE]" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex items-center justify-center border-l border-[rgba(23,105,255,0.16)] px-4 py-4">
                      {gps ? (
                        <Check className="w-[18px] h-[18px] text-[#1769FF]" strokeWidth={3} />
                      ) : (
                        <X className="w-[18px] h-[18px] text-[#9AA0AE]" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Info Text */}
        <motion.p 
          className="mt-6 text-left text-[13.5px] sm:text-[14px] font-medium text-[#56637F]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Both devices activate in the carQconnect app. Use both for complete coverage.
        </motion.p>

      </div>
    </section>
  );
}
