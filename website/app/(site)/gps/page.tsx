import Image from "next/image";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { Satellite, Clock, MapPinned, BellRing, Activity, Share2 } from "lucide-react";

export const metadata: Metadata = {
  title: "GPS Tracking",
  description: "Live location, trip history, geofencing and movement alerts for your vehicle, powered by compatible carQconnect GPS hardware.",
};

const features = [
  { icon: Satellite, title: "Live location", description: "See where your vehicle is right now, subject to device and network conditions." },
  { icon: Clock, title: "Trip history", description: "Review past trips, routes and distances." },
  { icon: MapPinned, title: "Geofencing", description: "Set safe zones and get notified on entry or exit." },
  { icon: BellRing, title: "Movement alerts", description: "Get alerted if your vehicle moves when it shouldn't, on supported devices." },
  { icon: Activity, title: "Device status", description: "Device health, last-seen time and connectivity, where available." },
  { icon: Share2, title: "Share trip", description: "Share a live location with someone you trust, when you choose to." },
];

export default function GpsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#FFFFFF] pt-[var(--nav-h,64px)] md:pt-[var(--nav-h,76px)] pb-12 md:pb-20 border-b border-[#ECEEF4]">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(600px 400px at 85% 0%, rgba(23, 105, 255, 0.12), transparent 70%)' }}
        />
        <div className="container-page relative z-10">
          <div className="py-5 md:py-6"><BackButton fallback="/features" label="Back to features" /></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left Column: Text (Exact doc content, aligned from the top) */}
            <div className="flex flex-col pt-2 sm:pt-3">
              <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
                <div className="w-8 h-[2px] bg-[#1769FF]" />
                <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                  GPS TRACKING
                </span>
              </div>
              
              <h1 
                className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5"
                style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
              >
                Know where your vehicle is.<br/>
                <span className="text-[#1769FF]">Wherever it goes.</span>
              </h1>
              
              <p className="text-[clamp(15px,1.2vw,17px)] leading-[1.65] text-[#56637F] max-w-[520px]">
                Connect a carQconnect GPS device to your vehicle for live tracking, trip history and geofence alerts.
              </p>
              <p className="mt-2.5 mb-8 text-[13px] text-[#7B7F90]">
                Live tracking depends on device and network conditions.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[14px]">
                <a href="/#download" className="flex items-center justify-center h-[50px] px-[28px] bg-[#1769FF] text-white text-[14px] font-bold rounded-[12px] shadow-sm hover:shadow hover:bg-[#0F57DB] transition-colors">
                  Download App
                </a>
                <a href="/marketplace" className="flex items-center justify-center h-[50px] px-[28px] bg-white border-[1.5px] border-[#E3E5EC] text-[#0B1B3F] text-[14px] font-bold rounded-[12px] hover:border-[#1769FF] hover:text-[#1769FF] transition-colors">
                  View GPS Devices
                </a>
              </div>
            </div>

            {/* Right Column: GPS App UI Showcase inside Card Container */}
            <div className="relative flex justify-center items-center lg:justify-end w-full mt-6 lg:mt-0">
              {/* Ambient Blue Radial Glow */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] sm:w-[460px] h-[360px] sm:h-[460px] rounded-full pointer-events-none -z-10"
                style={{
                  background: "radial-gradient(circle, rgba(23, 105, 255, 0.18) 0%, rgba(163, 183, 255, 0.08) 50%, transparent 75%)"
                }}
              />

              {/* Card Container */}
              <div className="relative z-10 w-full max-w-[360px] sm:max-w-[400px] rounded-[28px] sm:rounded-[32px] border border-[#ECEEF4] bg-white p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(11,27,63,0.08),0_4px_16px_rgba(23,105,255,0.06)] transition-transform duration-300 hover:scale-[1.01]">
                <Image
                  src="/images/img-gps.png"
                  alt="carQconnect GPS Tracking UI"
                  width={393}
                  height={560}
                  className="w-full h-auto object-contain block rounded-[20px]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-2 py-16 md:py-24 border-y border-border">
        <div className="container-page">
          <div>
            <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
              <div className="w-8 h-[2px] bg-[#1769FF]" />
              <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
                CAPABILITIES
              </span>
            </div>
            <h2 
              className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5"
              style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
            >
              What GPS tracking <span className="text-[#1769FF]">gives you</span>
            </h2>
            <p className="mb-10 max-w-[560px] text-[16px] leading-[1.7] text-[#56637F]">
              A clear view of your vehicle's location, movement and device health, all linked to one vehicle profile in the app.
            </p>
          </div>
          
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div 
                key={title} 
                className="rounded-card-lg border border-border bg-surface p-6 transition duration-200 hover:-translate-y-[2px] hover:border-[#1769FF] hover:shadow-[0_14px_30px_rgba(23, 105, 255, 0.14)]"
              >
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#EAF1FF]">
                  <Icon className="h-6 w-6 text-[#1769FF]" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 font-display font-medium text-ink">{title}</h3>
                <p className="mt-1.5 text-[13px] text-[#5b6478] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <p className="mt-[28px] max-w-[640px] text-[13px] leading-[1.65] text-[#5b6478]">
            Live tracking and alerts depend on your GPS device, network coverage and location conditions. Activate and link your device to a vehicle from the carQconnect app.
          </p>
        </div>
      </section>
    </>
  );
}
