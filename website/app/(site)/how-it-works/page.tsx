import type { Metadata } from "next";
import { HowItWorksScroll } from "@/components/sections/how-it-works-scroll";
import HowItWorksOverview from "@/components/sections/how-it-works-overview";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Follow the carQconnect journey, one step at a time.",
};

export default function HowItWorksPage() {
  return (
    <>
      {/* Overview Section */}
      <HowItWorksOverview />

      {/* Main scrolling steps */}
      <HowItWorksScroll />

      {/* Closing Band */}
      <section 
        className="py-14 min-[640px]:py-16 lg:py-24 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #A3B7FF 0%, #D2DCFF 40%, #F7F9FC 67%, #F7F9FC 100%)'
        }}
      >
        <div className="container-page relative z-10 flex flex-col items-center">
          <h2 className="font-display text-2xl min-[640px]:text-3xl lg:text-4xl font-extrabold text-[#0B1B3F]">
            Ready to <span className="text-[#1769FF]">start?</span>
          </h2>
          <p className="mt-2 min-[640px]:mt-3 lg:mt-4 text-sm min-[640px]:text-base lg:text-lg text-[#0B1B3F]/75 max-w-[540px]">
            Download the app and set up your vehicle.
          </p>
          <a
            href="/#download"
            className="mt-6 min-[640px]:mt-7 lg:mt-8 inline-flex h-11 lg:h-12 items-center justify-center rounded-[10px] bg-[#1769FF] text-white px-7 lg:px-9 text-sm font-bold shadow-[0_8px_20px_rgba(23,105,255,0.28)] hover:brightness-[1.08] transition-all"
          >
            Download App
          </a>
        </div>
      </section>
    </>
  );
}
