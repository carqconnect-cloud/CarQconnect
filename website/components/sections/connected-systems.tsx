"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { FeatureShowcase } from "./feature-showcase";
import { PrivacyControlSection } from "./privacy-control";

export function ConnectedSystems() {
  return (
    <>
      <section 
        id="systems" 
        className="w-full section-py max-[767px]:!pt-8 max-[767px]:!pb-24 relative overflow-hidden bg-[#F7F9FC] border-b border-[rgba(23,105,255,0.16)]"
      >
        <div className="container-page">
          <motion.div 
            className="flex flex-col"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
              <div className="w-8 h-[2px] bg-[#1769FF]" />
              <p className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                CONNECTED VEHICLE PLATFORM
              </p>
            </div>
            <h2 
              className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5"
              style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
            >
              Unified vehicle intelligence. <br />
              <span className="text-[#1769FF]">Safer, smarter journeys.</span>
            </h2>
            <p 
              className="leading-relaxed max-[767px]:!mb-3 max-[767px]:!text-[clamp(13px,3.2vw,15px)] max-[767px]:!leading-[1.5]"
              style={{ maxWidth: '68ch', marginBottom: 'var(--block-gap)', fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)', color: '#56637F' }}
            >
              carQconnect brings together QR emergency contact, live GPS tracking, and vehicle utilities into one unified ecosystem. Get instant private alerts when someone reaches you about your vehicle, real-time location visibility while you're on the move, and dedicated hardware engineered for everyday peace of mind.
            </p>
          </motion.div>

          <FeatureShowcase />
        </div>
      </section>

      <section 
        id="features" 
        className="section-py w-full bg-[#F7F9FC]"
      >
        <div className="container-page grid gap-[var(--block-gap)] lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <motion.div 
            className="pr-0 lg:pr-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
              <div className="w-8 h-[2px] bg-[#1769FF]" />
              <p className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                WHY CARQCONNECT
              </p>
            </div>
            <h2 
              className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5" 
              style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.12, letterSpacing: '-0.025em' }}
            >
              Because your vehicle needs more than a <span className="text-[#1769FF]">phone number on the dashboard.</span>
            </h2>
            <p className="mt-6 max-w-[48ch] text-[15px] sm:text-[16px] leading-relaxed text-[#56637F]">
              A QR sticker alone cannot protect privacy. A tracker alone cannot help a person who finds your parked car. carQconnect brings the moments that matter into one vehicle profile.
            </p>
            <Link 
              href="/features" 
              className="mt-10 inline-flex items-center justify-center gap-2 text-[clamp(13px,2vw,15px)] font-bold text-white bg-[#1769FF] hover:bg-[#0F57DB] hover:-translate-y-1 transition-all duration-300 py-[clamp(11px,2.5vw,15px)] px-[clamp(20px,4vw,30px)] rounded-[10px] w-fit shadow-[0_8px_20px_rgba(23,105,255,0.28)]"
            >
              See all product features <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </motion.div>
          <div className="grid gap-[var(--card-gap)] sm:grid-cols-2">
            {[
              ["Privacy first", "Your personal number stays private while a genuine caller can still reach you."],
              ["Useful in real life", "Parking, towing, emergencies and vehicle movement each have a clear action."],
              ["One vehicle record", "Hardware, safety status and future services stay connected to the same vehicle."],
              ["Built to grow", "Start with a QR tag, then add GPS and compatible road-visibility hardware when you need it."],
            ].map(([title, text], index) => {
              return (
                <motion.div 
                  key={title} 
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#1769FF] border bg-white border-[rgba(23,105,255,0.16)] shadow-[0_8px_30px_rgba(23,105,255,0.06)] hover:shadow-[0_12px_36px_rgba(23,105,255,0.14)]"
                >
                  <div className="flex items-center justify-center w-max px-3.5 py-1.5 rounded-[8px] mb-6 bg-[#EAF0FF]">
                    <span className="text-[13px] font-extrabold text-[#1769FF]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold mb-3 text-[#0B1B3F]">
                    {title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[#56637F]">
                    {text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <PrivacyControlSection />
    </>
  );
}
