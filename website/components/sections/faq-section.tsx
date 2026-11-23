"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { faqs } from "@/lib/data/faqs";

export function FaqSection() {
  return (
    <section id="faq" data-type-scale="off" className="bg-[#F7F9FC] section-py">

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          #faq .faq-outer-card {
            border-radius: clamp(12px, 3.6vw, 18px) !important;
          }
          #faq .faq-left-pane {
            padding: clamp(10px, 3.4vw, 16px) !important;
          }
          #faq .faq-right-pane {
            padding: clamp(10px, 3.4vw, 16px) !important;
          }
          #faq .faq-heading {
            font-size: clamp(20px, 5.4vw, 28px) !important;
            line-height: 1.15 !important;
          }
          #faq .faq-paragraph {
            font-size: clamp(11px, 3.2vw, 14px) !important;
            line-height: 1.5 !important;
          }
          #faq .help-card {
            padding: clamp(10px, 3.4vw, 16px) !important;
            border-radius: clamp(12px, 3.6vw, 18px) !important;
            margin-top: clamp(10px, 3vw, 16px) !important;
          }
          #faq .help-title {
            font-size: clamp(12px, 3.5vw, 15px) !important;
          }
          #faq .help-desc {
            font-size: clamp(10.5px, 3vw, 13px) !important;
          }
          #faq .help-link {
            font-size: clamp(11px, 3.2vw, 14px) !important;
          }
          #faq .faq-label {
            font-size: clamp(9.5px, 2.8vw, 12px) !important;
          }
          #faq .faq-sublabel {
            font-size: clamp(10.5px, 3vw, 13px) !important;
          }
          /* Override internal accordion styles */
          #faq .faq-item-button {
            padding: clamp(10px, 3vw, 14px) clamp(10px, 3.2vw, 16px) !important;
            min-height: 44px !important;
          }
          #faq .faq-item-title {
            font-size: clamp(11.5px, 3.4vw, 15px) !important;
            line-height: 1.3 !important;
          }
          #faq .faq-item-answer {
            font-size: clamp(10.5px, 3vw, 13.5px) !important;
            line-height: 1.5 !important;
            padding-bottom: clamp(10px, 3vw, 14px) !important;
            padding-inline: clamp(10px, 3.2vw, 16px) !important;
          }
          #faq .faq-item-icon {
            width: clamp(12px, 3.6vw, 16px) !important;
            height: clamp(12px, 3.6vw, 16px) !important;
          }
          #faq .faq-grid {
             gap: clamp(10px, 3vw, 16px) !important;
          }
        }
      `}} />

      <div className="container-page">
        <motion.div 
          className="overflow-hidden rounded-[28px] bg-[#F7F9FC] border border-[rgba(23,105,255,0.16)] shadow-[0_24px_56px_rgba(23,105,255,0.12)] faq-outer-card"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="grid lg:grid-cols-[0.78fr_1.22fr] faq-grid">
            <div className="relative overflow-hidden border-b border-[rgba(23,105,255,0.16)] p-8 sm:p-12 lg:border-b-0 lg:border-r lg:border-[rgba(23,105,255,0.16)] faq-left-pane bg-[linear-gradient(180deg,#D2DCFF_0%,#F7F9FC_100%)]">
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1769FF] bg-transparent px-3.5 py-1.5 text-[12px] font-bold text-[#1769FF]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1769FF]" /> Help centre
                </span>
                <h2 className="mt-7 font-display font-bold text-[#0B1B3F] text-[clamp(26px,3.2vw,32px)] leading-[1.2] faq-heading">
                  Questions, answered clearly.
                </h2>
                <p className="mt-5 max-w-sm text-base leading-7 text-[#56637F] faq-paragraph">
                  Everything you need to know before connecting your vehicle - from QR privacy to GPS visibility.
                </p>
                <div className="mt-12 rounded-[16px] border border-[rgba(23,105,255,0.16)] bg-[#F7F9FC] p-5 help-card">
                  <MessageCircle className="h-5 w-5 text-[#1769FF]" />
                  <p className="mt-4 text-sm font-semibold text-[#0B1B3F] help-title">Still need help?</p>
                  <p className="mt-1 text-sm leading-6 text-[#56637F] help-desc">
                    Our support team can guide you through setup, activation and hardware choices.
                  </p>
                  <Link 
                    href="/support" 
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1769FF] transition-colors pb-1 border-b-2 border-[#1769FF] hover:opacity-80 help-link"
                  >
                    Contact support <ArrowUpRight className="h-4 w-4 text-[#1769FF]" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-7 lg:p-10 faq-right-pane">
              <div className="mb-6 flex items-end justify-between gap-4 px-2 sm:px-0">
                <div>
                  <p className="text-xs font-bold text-[#1769FF] faq-label">FAQ</p>
                  <p className="mt-2 text-sm text-[#56637F] faq-sublabel">Quick answers for everyday decisions.</p>
                </div>
                <span className="hidden text-xs font-medium text-[#56637F] sm:block">{faqs.length} answers</span>
              </div>
              <FaqAccordion items={faqs.slice(0, 6)} />
              <Link 
                href="/faq" 
                className="mt-6 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#1769FF] bg-transparent px-5 py-3 text-sm font-semibold text-[#1769FF] transition hover:bg-[rgba(23,105,255,0.08)]"
              >
                View all FAQs <ArrowUpRight className="h-4 w-4 text-[#1769FF]" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
