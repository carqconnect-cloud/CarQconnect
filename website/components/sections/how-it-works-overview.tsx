"use client";

import React from 'react';
import { cn } from "@/lib/utils";

export default function HowItWorksOverview() {
  return (
    <section 
      id="how-it-works" 
      className="relative pt-28 sm:pt-36 pb-[clamp(32px,5vw,56px)] overflow-hidden w-full"
      style={{
        background: 'linear-gradient(180deg, #A3B7FF 0%, #D2DCFF 40%, #F7F9FC 67%, #F7F9FC 100%)'
      }}
    >
      <div className="container-page relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-[2px] bg-[#1769FF]" />
          <p className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase flex items-center gap-2">
            HOW IT WORKS <span className="opacity-50">&bull;</span> SHORT VERSION
          </p>
          <div className="w-8 h-[2px] bg-[#1769FF]" />
        </div>
        <h2 
          className="font-display font-extrabold text-[#0B1B3F] mb-6 sm:mb-8" 
          style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.12, letterSpacing: '-0.025em' }}
        >
          One setup.<br />
          <span className="text-[#1769FF]">Everyday confidence.</span>
        </h2>

        <div className="relative w-full mx-auto">
          {/* Horizontal Dashed Timeline for desktop */}
          <div className="hidden md:block absolute top-[24px] left-[16%] right-[16%] h-px border-t border-dashed border-[rgba(23,105,255,0.2)] z-0" />
          
          {/* Vertical Dashed Timeline for mobile */}
          <div className="md:hidden absolute top-[24px] bottom-[100px] left-1/2 -translate-x-1/2 w-px border-l border-dashed border-[rgba(23,105,255,0.2)] z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 relative z-10">
            {[
              {
                number: "01",
                title: "Choose your hardware",
                text: "Pick a QR tag, a GPS tracker, or both for your vehicle.",
              },
              {
                number: "02",
                title: "Activate in the app",
                text: "Link each device to the right vehicle and select your privacy preferences.",
              },
              {
                number: "03",
                title: "Drive connected",
                text: "Use safety, tracking and support features when you actually need them.",
              }
            ].map((step, index) => {
              const isLast = index === 2;
              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div className="relative mb-5">
                    {/* Circle */}
                    <div 
                      className={cn(
                        "w-[48px] h-[48px] rounded-full flex items-center justify-center text-[15px] font-bold",
                        isLast 
                          ? "bg-[#1769FF] text-white shadow-[0_8px_20px_rgba(23,105,255,0.28)]" 
                          : "border-[2px] border-[#1769FF] bg-[#EAF0FF] text-[#1769FF]"
                      )}
                    >
                      {step.number}
                    </div>
                  </div>

                  <div className="w-full h-full bg-white border border-[rgba(23,105,255,0.16)] rounded-[24px] p-6 sm:p-8 flex flex-col items-center shadow-[0_8px_30px_rgba(23,105,255,0.06)] transition-transform hover:-translate-y-1">
                    <h3 className="text-[19px] font-bold text-[#0B1B3F] mb-3 text-center">{step.title}</h3>
                    <p className="text-[15px] leading-[1.6] text-[#56637F] text-center">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Bridge */}
      <div className="w-full flex flex-col items-center justify-center pt-24 pb-12 lg:pt-8 lg:pb-8 relative z-10">
        <p className="mb-4 text-sm text-[#56637F]">Here is each step in detail.</p>
        <button 
          onClick={() => {
            const el = document.getElementById('step-0');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center justify-center"
          aria-label="Scroll to details"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
               className="motion-safe:animate-bounce" style={{ animationDuration: '1.6s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
    </section>
  );
}
