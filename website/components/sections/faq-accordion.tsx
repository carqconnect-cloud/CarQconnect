"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/data/faqs";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items, light = false, variant = "default" }: { items: Faq[]; light?: boolean; variant?: "default" | "dark" | "light" }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-[#E2E8F0] divide-y divide-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(18,19,26,0.04)]"
    >
      {items.map((faq, i) => {
        const open = openIndex === i;
        return (
          <div key={faq.question} className={cn("transition-colors", open ? "bg-[#F8FAFC]" : "bg-white")}>
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full min-h-[50px] items-center justify-between gap-4 px-5 py-5 text-left text-[16px] font-semibold transition-colors sm:px-6 text-[#0B1B3F] hover:bg-[#F1F5F9] faq-item-button"
            >
              <span className="faq-item-title text-[#0B1B3F]">{faq.question}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-300 text-[#1769FF] faq-item-icon",
                  open && "rotate-180"
                )}
              />
            </button>
            {open && (
              <p
                className="px-5 pb-6 text-[15px] sm:text-[15.5px] leading-[1.65] sm:px-6 text-[#1E293B] font-normal faq-item-answer"
              >
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
