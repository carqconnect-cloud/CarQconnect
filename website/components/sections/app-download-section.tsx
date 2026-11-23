"use client";

import { Smartphone, Apple, Mic, Calculator, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";

export function AppDownloadSection() {
  return (
    <section id="download" data-type-scale="off" className="bg-[#F7F9FC] border-y border-[rgba(23,105,255,0.16)] section-py overflow-hidden">

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          #download .left-col {
            gap: clamp(10px, 3vw, 16px) !important;
          }
          #download .eyebrow {
            font-size: clamp(11px, 1.8vw, 13px) !important;
          }
          #download .eyebrow-line {
            width: clamp(22px, 7vw, 32px) !important;
          }
          #download .heading {
            font-size: clamp(28px, 4.2vw, 46px) !important;
            line-height: 1.15 !important;
            letter-spacing: -0.015em !important;
            text-wrap: balance !important;
          }
          #download .paragraph {
            font-size: clamp(12px, 3.5vw, 15px) !important;
            line-height: 1.55 !important;
            max-width: 100% !important;
          }
          #download .feature-list {
            gap: clamp(12px, 3.6vw, 18px) !important;
          }
          #download .feature-item {
            gap: clamp(10px, 3vw, 14px) !important;
          }
          #download .feature-icon-wrapper {
            width: clamp(28px, 9vw, 38px) !important;
            height: clamp(28px, 9vw, 38px) !important;
          }
          #download .feature-icon-wrapper svg {
            width: 50% !important;
            height: 50% !important;
          }
          #download .feature-text-block {
            min-width: 0 !important;
          }
          #download .feature-title {
            font-size: clamp(12px, 3.6vw, 15px) !important;
            line-height: 1.25 !important;
          }
          #download .feature-desc {
            font-size: clamp(10.5px, 3vw, 13.5px) !important;
            line-height: 1.5 !important;
          }
          #download .store-btn {
            height: clamp(40px, 12vw, 48px) !important;
            max-width: 220px !important;
            gap: 8px !important;
          }
          #download .store-btn-small {
            font-size: clamp(8px, 2.4vw, 10px) !important;
          }
          #download .store-btn-text {
            font-size: clamp(13px, 3.8vw, 16px) !important;
          }
          #download .chat-card-wrap {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          #download .chat-card {
            padding: clamp(10px, 3.2vw, 16px) !important;
            border-radius: clamp(12px, 3.6vw, 18px) !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #download .chat-header-text {
            font-size: clamp(9.5px, 2.8vw, 12px) !important;
          }
          #download .chat-bubble {
            font-size: clamp(10.5px, 3.1vw, 13px) !important;
            line-height: 1.4 !important;
            padding: clamp(7px, 2.2vw, 11px) clamp(10px, 3vw, 14px) !important;
            max-width: 88% !important;
          }
          #download .chat-pills {
            gap: 6px !important;
            flex-wrap: wrap !important;
          }
          #download .chat-pill {
            font-size: clamp(9.5px, 2.8vw, 12px) !important;
            padding: 6px 10px !important;
          }
          #download .chat-note {
            font-size: clamp(9px, 2.6vw, 11.5px) !important;
          }
        }
        @media (max-width: 420px) {
          #download .store-btn-wrapper {
            flex-direction: column !important;
          }
          #download .store-btn {
            width: 100% !important;
            max-width: 220px !important;
          }
        }
      `}} />

      
      
      <div className="container-page grid lg:grid-cols-[1.25fr_0.75fr] gap-8 xl:gap-12 items-center relative">
        
        {/* LEFT COLUMN */}
        <motion.div 
          className="flex flex-col z-20 left-col"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-[32px] h-[2px] bg-[#1769FF] eyebrow-line" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase eyebrow">GET THE APP</span>
          </div>
          
          <h2 className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5 heading max-w-[640px]" style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}>
            Your vehicle's intelligence belongs in <span className="text-[#1769FF]">your pocket.</span>
          </h2>
          
          <p className="text-[clamp(14px,1.2vw,16px)] leading-[1.6] text-[#56637F] max-w-[620px] mb-8 paragraph">
            Plan trips by voice, get fuel and toll estimates, and get help when you need it. Safety, GPS and FASTag, all in one app. Buy hardware and activate it in the carQconnect app.
          </p>
          
          <div className="flex flex-col gap-6 mb-10 max-w-[620px] feature-list">
            <div className="flex items-start gap-4 feature-item">
              <div className="w-[36px] h-[36px] rounded-full bg-[#EAF0FF] border border-[rgba(23,105,255,0.16)] flex items-center justify-center shrink-0 feature-icon-wrapper">
                <Mic className="w-4 h-4 text-[#1769FF]" />
              </div>
              <div className="feature-text-block">
                <p className="text-[15px] font-bold text-[#0B1B3F] leading-tight feature-title">Voice trip planning</p>
                <p className="text-[14px] text-[#56637F] mt-1.5 leading-snug feature-desc">Just say where you're going. The app plans the route.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 feature-item">
              <div className="w-[36px] h-[36px] rounded-full bg-[#EAF0FF] border border-[rgba(23,105,255,0.16)] flex items-center justify-center shrink-0 feature-icon-wrapper">
                <Calculator className="w-4 h-4 text-[#1769FF]" />
              </div>
              <div className="feature-text-block">
                <p className="text-[15px] font-bold text-[#0B1B3F] leading-tight feature-title">Fuel and toll estimates</p>
                <p className="text-[14px] text-[#56637F] mt-1.5 leading-snug feature-desc">See the estimated cost before you start, based on your vehicle's mileage.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 feature-item">
              <div className="w-[36px] h-[36px] rounded-full bg-[#EAF0FF] border border-[rgba(23,105,255,0.16)] flex items-center justify-center shrink-0 feature-icon-wrapper">
                <MessageSquareText className="w-4 h-4 text-[#1769FF]" />
              </div>
              <div className="feature-text-block">
                <p className="text-[15px] font-bold text-[#0B1B3F] leading-tight feature-title">AI support, with a human backup</p>
                <p className="text-[14px] text-[#56637F] mt-1.5 leading-snug feature-desc">Get quick answers, and the conversation passes to a person if needed.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full store-btn-wrapper">
            <a
              href="#download"
              className="group flex items-center justify-center gap-2.5 h-[48px] bg-[#0B1B3F] border border-[#0B1B3F] rounded-[10px] px-5 hover:border-[#1769FF] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(23,105,255,0.25)] active:scale-[0.97] active:translate-y-0 transition-all duration-200 cursor-pointer w-full sm:w-[180px] shadow-sm store-btn focus-visible:outline-2 focus-visible:outline-[#1769FF]"
            >
              <img src="/appleicon.png" alt="App Store" className="w-[22px] h-[22px] object-contain" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] leading-tight text-white/70 store-btn-small">Download on the</span>
                <span className="text-[15px] font-semibold leading-tight text-white store-btn-text">App Store</span>
              </div>
            </a>
            <a
              href="#download"
              className="group flex items-center justify-center gap-2.5 h-[48px] bg-[#0B1B3F] border border-[#0B1B3F] rounded-[10px] px-5 hover:border-[#1769FF] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(23,105,255,0.25)] active:scale-[0.97] active:translate-y-0 transition-all duration-200 cursor-pointer w-full sm:w-[180px] shadow-sm store-btn focus-visible:outline-2 focus-visible:outline-[#1769FF]"
            >
              <img src="/googleicon.png" alt="Google Play" className="w-6 h-6 object-contain" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] leading-tight text-white/70 store-btn-small">GET IT ON</span>
                <span className="text-[15px] font-semibold leading-tight text-white store-btn-text">Google Play</span>
              </div>
            </a>
          </div>
        </motion.div>

        {/* RIGHT COLUMN (Normal Box Chat Card Showcase - Right Aligned) */}
        <motion.div 
          className="relative flex justify-center items-center lg:justify-end min-h-[380px] z-10 w-full"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex items-center justify-center lg:justify-end w-full max-w-[280px] sm:max-w-[310px] md:max-w-[325px] lg:ml-auto">
            {/* Ambient Blue Radial Glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] md:w-[300px] md:h-[300px] rounded-full pointer-events-none" 
              style={{ background: 'radial-gradient(circle at center, #7FA0FF 0%, #A3B7FF 32%, #BFD0FF 55%, #D2DCFF 72%, rgba(247, 249, 252, 0) 90%)', filter: 'blur(24px)', opacity: 0.9 }} 
            />
            
            {/* Normal Box Container - Right Aligned & Proportional */}
            <div className="relative z-10 w-full rounded-[24px] sm:rounded-[28px] border border-[#222A3E] bg-[#0A101D] shadow-[0_24px_50px_rgba(23,105,255,0.18),0_12px_30px_rgba(0,0,0,0.14)] overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
              <img
                src="/images/img-for-ai-cropped.png"
                alt="carQconnect AI Chat"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>
        </motion.div>
    </div>
  </section>
  );
}

