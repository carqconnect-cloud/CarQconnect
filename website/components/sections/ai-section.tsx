import Image from "next/image";
import { Sparkles, Navigation, Fuel } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

export function AiSection() {
  return (
    <section className="bg-[#F7F9FC] border-b border-[#E2E8F0] py-16 sm:py-24 overflow-hidden relative">
      <div className="container-page grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Text & Features */}
        <div className="w-full lg:col-span-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1769FF]/10 text-[#1769FF] text-[13px] font-semibold mb-4">
            <Sparkles className="h-4 w-4" />
            <span>AI Assistant</span>
          </div>

          <SectionHeading
            title="Just ask carQconnect."
            description="carQconnect AI connects natural-language requests to trip planning, fuel and toll estimates, GPS status, orders, membership and support — always within your approved account permissions."
          />

          <ul className="text-[clamp(14px,1.8vw,16px)] text-[#56637F] mt-6 sm:mt-8 flex flex-col gap-3.5">
            <li className="flex items-start gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#1769FF] mt-[9px]" />
              <span className="leading-relaxed">Understands trip, tracking and support requests in plain natural language</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#1769FF] mt-[9px]" />
              <span className="leading-relaxed">Explains why a specific route, rest stop, or fuel pump was recommended</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#1769FF] mt-[9px]" />
              <span className="leading-relaxed">Asks for confirmation before any purchases, subscriptions, or sensitive actions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#1769FF] mt-[9px]" />
              <span className="leading-relaxed">Seamlessly escalates to human assistance when queries require personalized support</span>
            </li>
          </ul>
        </div>

        {/* Right Column: Realistic Phone Mockup with ambient glow and floating chips */}
        <div className="w-full lg:col-span-6 flex justify-center lg:justify-end relative">
          {/* Ambient radial glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] rounded-full pointer-events-none -z-10"
            style={{
              background: "radial-gradient(circle, rgba(23, 105, 255, 0.16) 0%, rgba(163, 183, 255, 0.08) 50%, transparent 75%)"
            }}
          />

          <div className="relative">
            {/* Floating Top Badge */}
            <div className="absolute -top-4 -left-4 sm:-left-8 z-20 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2.5 shadow-[0_12px_28px_rgba(11,27,63,0.12)] border border-[#D2DCFF] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1769FF]/10 flex items-center justify-center text-[#1769FF]">
                <Navigation className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-bold text-[#0B1B3F] leading-tight">Indore → Ujjain</span>
                <span className="text-[11px] text-[#56637F]">156 km • 3h 20m</span>
              </div>
            </div>

            {/* Phone Chassis */}
            <div className="relative w-[270px] sm:w-[295px] aspect-[393/772] rounded-[38px] sm:rounded-[42px] p-[3px] bg-gradient-to-b from-[#2B3142] via-[#1A1E29] to-[#0E1118] shadow-[0_25px_60px_-12px_rgba(11,27,63,0.28)] border-[3px] border-[#373E52]">
              {/* Phone Inner Screen Container */}
              <div className="relative w-full h-full rounded-[34px] sm:rounded-[38px] overflow-hidden bg-black">
                {/* Dynamic Island / Speaker Pill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-20 h-4 bg-black rounded-full flex items-center justify-end pr-2 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1769FF]/60" />
                </div>

                <Image
                  src="/images/trip-intelligence-mockup.png"
                  alt="carQconnect Trip Intelligence Route & Navigation"
                  fill
                  sizes="(max-width: 640px) 270px, 295px"
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>

            {/* Floating Bottom Badge */}
            <div className="absolute -bottom-4 -right-4 sm:-right-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2.5 shadow-[0_12px_28px_rgba(11,27,63,0.12)] border border-[#D2DCFF] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#10B981]/15 flex items-center justify-center text-[#10B981]">
                <Fuel className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-bold text-[#0B1B3F] leading-tight">Optimized Stops</span>
                <span className="text-[11px] text-[#56637F]">Fuel, EV, Food & Safety</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
