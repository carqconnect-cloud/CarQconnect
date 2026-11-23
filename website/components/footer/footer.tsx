"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ShieldCheck, ArrowUp } from "lucide-react";
import { footerColumns } from "@/lib/data/nav";

export function Footer() {
  const scrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      data-type-scale="off"
      className="relative overflow-hidden border-t border-[rgba(23,105,255,0.16)]"
      style={{
        background: "linear-gradient(180deg, #F7F9FC 0%, #D2DCFF 55%, #A3B7FF 100%)",
      }}
    >
      {/* MAIN FOOTER CONTENT */}
      <div className="container-page relative z-10 pt-7 sm:pt-10 lg:pt-[var(--section-py)] pb-4 min-[640px]:pb-6">
        {/* 2 cols on phones, 4 cols from 640px, 5 cols in 1 row on desktop */}
        <div className="footer-main-grid grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 sm:gap-y-8 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-y-10">
          {/* BRAND */}
          <div className="footer-brand-col col-span-2 sm:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-[#1769FF] rounded-lg">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#1769FF] shadow-sm">
                <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-[clamp(19px,5vw,22px)] font-bold text-[#0B1B3F]">
                carQconnect
              </span>
            </Link>

            <p className="mt-2.5 mb-3.5 max-w-[290px] text-[13px] leading-[1.55] text-[#56637F] min-[640px]:mt-4 min-[640px]:mb-5 min-[640px]:text-[14.5px]">
              One connected ecosystem for your vehicle&apos;s safety, tracking and everyday journeys.
            </p>

            <div className="flex flex-wrap items-center gap-[10px]">
              <a
                href="#"
                className="group flex shrink-0 items-center gap-2.5 rounded-[10px] bg-[#0B1B3F] border border-[#0B1B3F] px-3 py-2 transition-all duration-200 hover:border-[#1769FF] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(23,105,255,0.22)] active:scale-[0.97] active:translate-y-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1769FF]"
              >
                <img src="/appleicon.png" alt="App Store" width={20} height={20} className="h-5 w-5 object-contain" />
                <div className="flex flex-col items-start whitespace-nowrap">
                  <span className="text-[9px] leading-tight text-white/70">Download on the</span>
                  <span className="text-[11px] font-semibold leading-tight text-white min-[640px]:text-[12px]">
                    App Store
                  </span>
                </div>
              </a>
              <a
                href="#"
                className="group flex shrink-0 items-center gap-2.5 rounded-[10px] bg-[#0B1B3F] border border-[#0B1B3F] px-3 py-2 transition-all duration-200 hover:border-[#1769FF] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(23,105,255,0.22)] active:scale-[0.97] active:translate-y-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1769FF]"
              >
                <img src="/googleicon.png" alt="Google Play" width={22} height={22} className="h-[20px] w-[20px] min-[640px]:h-[22px] min-[640px]:w-[22px] object-contain" />
                <div className="flex flex-col items-start whitespace-nowrap">
                  <span className="text-[9px] leading-tight text-white/70">GET IT ON</span>
                  <span className="text-[11px] font-semibold leading-tight text-white min-[640px]:text-[12px]">
                    Google Play
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* LINK COLUMNS */}
          {footerColumns.map((col, index) => (
            <div key={col.title} className={`min-w-0 ${index === footerColumns.length - 1 ? "max-[639px]:pr-8" : ""}`}>
              <h4 className="mb-2 text-[14px] font-bold text-[#0B1B3F] min-[640px]:mb-3 min-[1100px]:mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-0 min-[1100px]:gap-[8px]">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex min-h-[30px] items-center whitespace-normal py-0.5 text-[13px] text-[#56637F] transition-all duration-200 hover:translate-x-1 hover:text-[#1769FF] focus-visible:text-[#1769FF] focus-visible:outline-none min-[640px]:min-h-[36px] min-[640px]:py-1 min-[640px]:text-[14.5px] min-[1100px]:min-h-[40px] min-[1100px]:py-0"
                    >
                      {link.label}{" "}
                      <span className="ml-0 text-base leading-none text-[#1769FF] opacity-0 transition-all duration-200 group-hover:ml-1 group-hover:opacity-100">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* COPYRIGHT BAR */}
        <div
          id="footer-copy-bar"
          className="relative z-10 mt-5 flex items-center justify-between gap-4 border-t border-[rgba(23,105,255,0.16)] pt-3 max-[639px]:pr-[64px] min-[640px]:mt-8 min-[640px]:py-[12px]"
        >
          <p className="flex flex-col gap-[2px] text-[12px] text-[#56637F] min-[640px]:text-[13px]">
            <span>&copy; 2026 carQconnect.</span>
            <span>All rights reserved.</span>
          </p>
          <a
            href="#"
            onClick={scrollToTop}
            className="group flex min-h-[44px] items-center gap-1.5 text-[12px] font-semibold text-[#1769FF] transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#1769FF] rounded-sm min-[640px]:text-[13px]"
          >
            Back to top{" "}
            <ArrowUp
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1 text-[#1769FF]"
              strokeWidth={2.5}
            />
          </a>
        </div>
      </div>

      {/* WATERMARK BACKGROUND TEXT: carQconnect */}
      <div
        aria-hidden="true"
        className="container-page pointer-events-none relative z-0 select-none pt-0 pb-3 min-[640px]:pb-[clamp(16px,4vw,32px)]"
      >
        <svg
          viewBox="0 0 1000 150"
          preserveAspectRatio="xMidYMax meet"
          className="block h-auto w-full font-display"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="cq-watermark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B1B3F" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0B1B3F" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="128"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fill="url(#cq-watermark)"
            style={{
              fontSize: 170,
              fontWeight: 800,
              fontFamily: "var(--font-manrope), sans-serif",
            }}
          >
            carQconnect
          </text>
        </svg>
      </div>
    </footer>
  );
}
