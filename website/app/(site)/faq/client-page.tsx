"use client";

import { useState } from "react";
import { Search, Mic } from "lucide-react";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { faqs, FaqCategory } from "@/lib/data/faqs";

const CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "start", label: "Getting started" },
  { id: "qr", label: "QR Safety" },
  { id: "safety", label: "SOS and safety" },
  { id: "gps", label: "GPS tracking" },
  { id: "trip", label: "Trip Planner" },
  { id: "ai", label: "AI assistant" },
  { id: "util", label: "Vehicle utilities" },
  { id: "priv", label: "Privacy" },
];

export default function FaqClient() {
  const [activeCat, setActiveCat] = useState<FaqCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = activeCat === "all" || faq.category === activeCat;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-[#f7f9fc] min-h-[100svh] font-display text-[#0f1220]">
      {/* HEADER HERO */}
      <section 
        className="relative pt-[120px] pb-[32px] overflow-hidden border-b border-[#e1e6ee]"
        style={{ background: 'var(--bg-gradient)' }}
      >
        <div className="container-page relative z-10 flex flex-col items-start text-left">
          
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              FAQS
            </span>
          </div>
          
          <h1 
            className="font-display font-extrabold text-[#0B1B3F] max-w-[800px] mb-4 sm:mb-5"
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            Frequently asked <span className="text-[#1769FF]">questions.</span>
          </h1>
          
          <p className="text-[clamp(15px,1.2vw,17px)] text-[#56637F] max-w-[560px] leading-relaxed">
            Quick answers about QR safety, GPS tracking, hardware and the carQconnect app.
          </p>

          <div className="relative mt-[24px] w-full max-w-[560px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-[20px] w-[20px] text-[#a4abb8]" />
            </div>
            <input
              type="text"
              placeholder="Search questions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[48px] pl-[44px] pr-4 rounded-[12px] border border-[#e1e6ee] bg-white text-[15px] text-[#0f1220] placeholder:text-[#a4abb8] focus:outline-none focus:ring-2 focus:ring-[#1769FF] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-[20px]">
            {CATEGORIES.map((cat) => {
              const isActive = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCat(cat.id)}
                  aria-pressed={isActive}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1769FF] focus:ring-offset-2 border ${
                    isActive
                      ? "bg-[#1769FF] font-semibold text-white font-bold border-[#1769FF]"
                      : "border-[#e1e6ee] bg-white font-medium text-[#0f1220] hover:border-[#1769FF] hover:text-[#1769FF]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* FAQ LIST */}
      <section className="py-[64px]">
        <div className="container-page">
          {filteredFaqs.length > 0 ? (
            <FaqAccordion items={filteredFaqs} />
          ) : (
            <div className="text-center py-12">
              <p className="text-[16px] text-[#5b6478]">No questions found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* CLOSING BAND */}
      <section 
        id="download" 
        className="py-[56px] lg:py-[72px] relative overflow-hidden" 
        style={{ background: 'linear-gradient(180deg, #A3B7FF 0%, #D2DCFF 40%, #F7F9FC 67%, #F7F9FC 100%)' }}
      >
        <div className="container-page grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-[40px] items-center">
          
          {/* Left Column */}
          <div className="flex flex-col items-start text-left">
            <div className="inline-block rounded-full bg-[#1769FF]/12 border border-[#1769FF]/25 px-[14px] py-[6px] text-[12px] font-[800] tracking-[0.14em] text-[#1769FF] uppercase mb-4">
              AI ASSISTANT
            </div>
            <h2 className="font-display font-extrabold text-[#0B1B3F] text-2xl min-[640px]:text-3xl lg:text-4xl mb-4 leading-tight">
              Still have questions? Our AI assistant can <span className="text-[#1769FF]">help.</span>
            </h2>
            <p className="text-[15px] text-[#0B1B3F]/75 max-w-[520px] mb-8 leading-[1.6]">
              Install the app and chat or speak to the assistant for instant answers. If it cannot solve something, a support executive takes over with your full conversation.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#download" className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-[#1769FF] px-6 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(23,105,255,0.28)] hover:brightness-[1.08] transition-all">
                Download App
              </a>
              <a href="/support" className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-white border-[1.5px] border-[#1769FF] px-6 text-[15px] font-bold text-[#1769FF] hover:bg-[rgba(23,105,255,0.08)] transition-all">
                Contact support
              </a>
            </div>
          </div>

          {/* Right Column: Chat Mockup */}
          <div className="w-full max-w-[420px] ml-auto bg-white rounded-[22px] p-[18px] shadow-[0_24px_50px_rgba(23,105,255,0.12)] border border-[#D2DCFF]/60 flex flex-col gap-4 aria-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-[#D2DCFF]/40">
              <div className="w-[8px] h-[8px] rounded-full bg-[#1fa463]" />
              <span className="text-[13px] font-bold text-[#0B1B3F]">carQconnect assistant</span>
            </div>
            
            {/* Messages */}
            <div className="flex flex-col gap-4">
              {/* User message */}
              <div className="self-end max-w-[85%] bg-[#0B1B3F] text-white text-[13.5px] px-4 py-3 rounded-[14px] rounded-br-[4px] shadow-sm leading-relaxed">
                Plan a trip from Indore to Udaipur for tomorrow.
              </div>
              
              {/* Assistant message */}
              <div className="self-start max-w-[85%] bg-[#F0F4FF] text-[#0B1B3F] text-[13.5px] px-4 py-3 rounded-[14px] rounded-bl-[4px] shadow-sm leading-relaxed border border-[#D2DCFF]/50">
                Sure. I will check distance, fuel and toll. Which vehicle should I use?
              </div>
            </div>

            {/* Input row */}
            <div className="mt-2 flex items-center justify-between h-[44px] rounded-[12px] border border-[#D2DCFF] bg-[#F7F9FC] px-4">
              <span className="text-[#0B1B3F]/50 text-[13.5px]">Type or speak your question</span>
              <Mic className="w-[18px] h-[18px] text-[#1769FF]" strokeWidth={2.5} />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

