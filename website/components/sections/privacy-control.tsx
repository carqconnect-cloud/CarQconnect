"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrivacyControlSection() {
  return (
    <section id="safety" className="w-full bg-white section-py">
      <div className="container-page">
        
        {/* TOP AREA */}
        <div className="grid gap-[var(--block-gap)] items-center lg:grid-cols-[1.25fr_0.75fr]">
          
          {/* LEFT: Text & CTAs */}
          <div className="flex flex-col pr-0 lg:pr-8">
            <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
              <div className="w-8 h-[2px] bg-[#1769FF]" />
              <p className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                PRIVACY & CONTROL
              </p>
            </div>
            
            <h2 
              className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5"
              style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.12, letterSpacing: '-0.025em' }}
            >
              Built around privacy,<br />
              safety and <span className="text-[#1769FF]">control.</span>
            </h2>
            
            <p className="text-[16px] sm:text-[17.5px] leading-[1.65] text-[#56637F] max-w-[620px] mb-6 md:mb-10">
              Public QR actions are designed to expose only approved information. Owner contact stays protected, while important interactions remain useful and reusable.
            </p>
            
            <div className="flex items-center gap-6">
              <Link 
                href="/#download"
                className="inline-flex items-center justify-center bg-[#1769FF] text-white text-[clamp(11px,2vw,13px)] font-bold uppercase tracking-[0.06em] px-[clamp(18px,4vw,26px)] py-[clamp(11px,3vw,15px)] rounded-[10px] shadow-[0_8px_20px_rgba(23,105,255,0.28)] hover:bg-[#0F57DB] transition-all hover:-translate-y-1"
              >
                CREATE YOUR ACCOUNT
              </Link>
            </div>
          </div>
          
          {/* RIGHT: Phone Mockup */}
          <div className="w-full max-w-[380px] ml-auto mr-0 bg-[#F7F8FC] rounded-[24px] p-[16px] [@media(max-width:959px)]:mx-auto [@media(max-width:959px)]:mt-2">
            <div className="bg-white border border-[rgba(23,105,255,0.16)] rounded-[22px] overflow-hidden shadow-[0_18px_50px_rgba(23,105,255,0.08)]">
              {/* Header Bar */}
              <div className="bg-[#1769FF] px-[18px] py-[14px] flex items-center justify-between">
                <span className="text-white text-[12px] font-semibold">What a scanner sees</span>
                <span className="text-white/80 text-[12px] font-bold">No app needed</span>
              </div>
              
              <div className="p-[18px] pb-[16px]">
                {/* Block 1: Actions */}
                <div className="mb-4">
                  <h4 className="text-[clamp(8.5px,1.8vw,10.5px)] font-bold tracking-[0.14em] text-[#1769FF] uppercase mb-3">AVAILABLE ACTIONS</h4>
                  <div className="flex flex-col gap-[6px]">
                    {["Call owner (masked)", "Send message", "Report an issue", "Emergency action"].map(action => (
                      <div key={action} className="flex items-center gap-3 bg-[#EAF0FF] rounded-[9px] px-[10px] py-[6px]">
                        <Check className="w-[14px] h-[14px] text-[#1769FF]" strokeWidth={3} />
                        <span className="text-[13px] font-semibold text-[#0B1B3F]">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Block 2: Not Exposed */}
                <div className="pt-4 border-t border-dashed border-[#D9DCE8] -mx-[18px] px-[18px] bg-[#FAFAFC] pb-2">
                  <h4 className="text-[10.5px] font-bold tracking-[0.14em] text-[#56637F] uppercase mb-3">NOT EXPOSED</h4>
                  <div className="flex flex-col gap-[6px]">
                    {["Owner's personal number", "Private customer data", "Medical info (unless opted in)"].map(item => (
                      <div key={item} className="flex items-center gap-3 bg-[#EFF0F5] rounded-[9px] px-[10px] py-[6px]">
                        <Lock className="w-[12px] h-[12px] text-[#56637F]" strokeWidth={2.5} aria-hidden="true" />
                        <span className="text-[13px] font-semibold text-[#56637F] blur-[3.5px] select-none" aria-hidden="true">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* BOTTOM CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--card-gap)] mt-[var(--block-gap)]">
          {[
            {
              num: "01",
              title: "Privacy",
              items: ["Masked calling instead of your personal number", "Public page shows only what the owner configures", "No private data without owner's permission"],
            },
            {
              num: "02",
              title: "Safety",
              items: ["Press-and-hold SOS to avoid accidental alerts", "Family contacts notified with your location", "Medical info only if you opt in"],
            },
            {
              num: "03",
              title: "Control",
              items: ["Owner sets the QR privacy settings", "Location, notifications and communication need consent", "Rate limiting and anti-abuse on public QR"],
            }
          ].map(card => (
            <div 
              key={card.num}
              className="rounded-[22px] p-[20px] transition-all duration-200 ease-out hover:-translate-y-[5px] bg-white border border-[rgba(23,105,255,0.16)] shadow-[0_10px_30px_rgba(23,105,255,0.05)] hover:shadow-[0_18px_44px_rgba(23,105,255,0.1)]"
            >
              <div className="inline-flex items-center justify-center px-[11px] py-[5px] rounded-[9px] mb-6 bg-[#EAF0FF]">
                <span className="text-[12px] font-bold text-[#1769FF]">{card.num}</span>
              </div>
              <h3 className="font-display font-bold text-[18px] mb-4 text-[#0B1B3F]">
                {card.title}
              </h3>
              <ul className="flex flex-col">
                {card.items.map((item, i) => (
                  <li 
                    key={i} 
                    className={cn(
                      "relative py-[7px] pl-[24px]",
                      i > 0 && "border-t border-[rgba(23,105,255,0.12)]"
                    )}
                  >
                    <Check className="absolute left-0 top-[9px] w-[14px] h-[14px] text-[#1769FF]" strokeWidth={3} />
                    <span className="text-[13.5px] leading-relaxed text-[#56637F]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* TRUST STRIP */}
        <div className="flex flex-wrap items-center justify-start gap-x-[28px] gap-y-[10px] mt-[var(--block-gap)]">
          {["Server-verified payments", "Rate-limited QR scans", "Consent-based location"].map(text => (
            <div key={text} className="flex items-center gap-[8px]">
              <div className="w-[4px] h-[4px] rounded-full bg-[#1769FF]" />
              <span className="text-[clamp(11px,1.8vw,12.5px)] font-semibold text-[#56637F]">{text}</span>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
