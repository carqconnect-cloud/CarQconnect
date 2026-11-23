"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, QrCode, MapPin, Signal } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

type Filter = "all" | "qr" | "gps" | "soon";

export default function MarketplaceClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const show = (cat: Filter) => filter === "all" || filter === cat;

  return (
    <div className="font-display text-[#0f1220]">
      {/* 1) HERO BAND */}
      <section 
        className="relative pt-[var(--nav-h,64px)] md:pt-[var(--nav-h,76px)] pb-[48px] md:pb-[64px] overflow-visible"
        style={{ background: 'var(--bg-gradient)' }}
      >
        <div className="relative z-10 container-page flex flex-col items-start text-left">
          <div className="py-5 md:py-6"><BackButton fallback="/features" label="Back to features" /></div>
          
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              HARDWARE
            </span>
          </div>
          
          <h1 
            className="font-display font-extrabold text-[#0B1B3F] max-w-[800px] mb-4 sm:mb-5"
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            Upgrade your vehicle with <span className="text-[#1769FF]">carQconnect.</span>
          </h1>
          
          <p className="text-[clamp(15px,1.2vw,17px)] text-[#56637F] max-w-[580px] leading-relaxed">
            QR safety tags and GPS trackers, delivered to you, then activated and linked to your vehicle in the app.
          </p>

          <div className="flex flex-wrap items-center justify-start gap-3 mt-[18px]">
            {[
              "Order in the app",
              "Activate in the app",
              "One connected vehicle profile"
            ].map(chip => (
              <div key={chip} className="flex items-center gap-2 rounded-full border border-[#e1e6ee] bg-white px-4 py-2 text-[13px] font-medium text-[#5b6478]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#1769FF]" />
                {chip}
              </div>
            ))}
          </div>

          {/* 2) FILTER CHIPS */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap mt-[24px] w-full">
            {[
              { id: "all", label: "All products" },
              { id: "qr", label: "QR Safety" },
              { id: "gps", label: "GPS Devices" },
              { id: "soon", label: "Coming soon" },
            ].map((btn) => {
              const active = filter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilter(btn.id as Filter)}
                  aria-pressed={active}
                  className={`flex-shrink-0 rounded-full px-2.5 sm:px-3 md:px-5 min-h-[32px] md:min-h-[44px] text-[11px] sm:text-[13px] md:text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1769FF] focus:ring-offset-2 border ${
                    active
                      ? "bg-[#1769FF] font-semibold text-white border-[#1769FF]"
                      : "border-[#e1e6ee] bg-white font-medium text-[#0f1220] hover:border-[#1769FF] hover:text-[#1769FF]"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3) PRODUCT GRID BAND */}
      <section className="bg-[#eaeff6] py-[48px]">
        <div className="container-page flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--card-gap,clamp(16px,2vw,24px))] items-stretch auto-rows-fr w-full">
            {/* QR Safety Tag */}
            {show("qr") && (
              <div className="flex flex-col h-full rounded-[24px] border border-[#dbe2ee] bg-white shadow-xs hover:border-[#1769FF] hover:shadow-[0_18px_40px_rgba(23,105,255,0.12)] transition duration-200 hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 overflow-hidden">
                <div 
                  className="relative w-full aspect-[16/8] min-h-[160px] flex items-center justify-center overflow-hidden bg-[#101C33]"
                >
                  <Image
                    src="/images/qr-card-hero.png"
                    alt="carQconnect QR Safety Tag"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute top-4 left-4 z-20 rounded-full bg-[#e6f7ee] text-[#0b6b3a] px-2.5 py-0.5 text-[11px] font-bold shadow-xs">
                    Most popular
                  </div>
                </div>
                
                <div className="p-5 md:p-6 flex flex-col flex-grow">
                  <div className="text-[12px] font-bold tracking-[0.08em] text-[#1769FF] uppercase mb-[6px]">
                    QR SAFETY
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-[600] text-[#0f1220] leading-snug mb-[8px]">
                    carQconnect QR Safety Tag
                  </h3>
                  <p className="text-[16px] text-[#5b6478] leading-[1.55] mb-[16px] min-h-[48px]">
                    A private, practical identity for your vehicle. Anyone who finds it can reach you without seeing your number.
                  </p>
                  
                  <div className="w-full h-[1px] bg-[#e1e6ee] mb-[16px]" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px] gap-y-[10px] mb-[16px]">
                    {["Masked calling", "Scanner needs no app", "Parking and emergency reporting", "Linked to one vehicle"].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <Check className="w-[15px] h-[15px] text-[#1769FF] shrink-0 mt-[3px]" strokeWidth={2.5} />
                        <span className="text-[14px] font-medium text-[#0f1220] leading-[1.45]">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pinned bottom note & button group */}
                  <div className="mt-auto flex flex-col pt-2">
                    <p className="text-[14px] text-[#717b91] leading-[1.5] mb-[20px] min-h-[42px] sm:min-h-[22px]">
                      Available as sticker or tag. You choose what the public can see.
                    </p>
                    <a 
                      href="#download" 
                      className="self-start inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#1769FF] px-6 text-[14px] font-bold text-white shadow-sm hover:shadow hover:bg-[#0F57DB] transition-colors"
                    >
                      Get it in the app
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* GPS Tracker */}
            {show("gps") && (
              <div className="flex flex-col h-full rounded-[24px] border border-[#dbe2ee] bg-white shadow-xs hover:border-[#1769FF] hover:shadow-[0_18px_40px_rgba(23,105,255,0.12)] transition duration-200 hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 overflow-hidden">
                <div 
                  className="relative w-full aspect-[16/8] min-h-[160px] flex items-center justify-center overflow-hidden bg-[#0C1E32]"
                >
                  <Image
                    src="/images/gps-tracker-card.png"
                    alt="carQconnect GPS Tracker"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center"
                    priority
                  />
                  
                  <div className="absolute top-4 left-4 z-20 rounded-full bg-[#e6f7ee] text-[#0b6b3a] px-2.5 py-0.5 text-[11px] font-bold shadow-xs">
                    New
                  </div>
                </div>
                
                <div className="p-5 md:p-6 flex flex-col flex-grow">
                  <div className="text-[12px] font-bold tracking-[0.08em] text-[#1769FF] uppercase mb-[6px]">
                    GPS DEVICES
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-[600] text-[#0f1220] leading-snug mb-[8px]">
                    carQconnect GPS Tracker
                  </h3>
                  <p className="text-[16px] text-[#5b6478] leading-[1.55] mb-[16px] min-h-[48px]">
                    Live location, geofencing and trip history, so you can see your vehicle's status at a glance.
                  </p>
                  
                  <div className="w-full h-[1px] bg-[#e1e6ee] mb-[16px]" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px] gap-y-[10px] mb-[16px]">
                    {["Live location, last-seen", "Geofence entry and exit alerts", "Trip history and sharing", "Movement alerts, device status"].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <Check className="w-[15px] h-[15px] text-[#1769FF] shrink-0 mt-[3px]" strokeWidth={2.5} />
                        <span className="text-[14px] font-medium text-[#0f1220] leading-[1.45]">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pinned bottom note & button group */}
                  <div className="mt-auto flex flex-col pt-2">
                    <p className="text-[14px] text-[#717b91] leading-[1.5] mb-[20px] min-h-[42px] sm:min-h-[22px]">
                      Live tracking depends on device and network conditions.
                    </p>
                    <a 
                      href="#download" 
                      className="self-start inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#1769FF] px-6 text-[14px] font-bold text-white shadow-sm hover:shadow hover:bg-[#0F57DB] transition-colors"
                    >
                      Get it in the app
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Coming soon card - full width of container-page */}
          {show("soon") && (
            <div className="w-full flex flex-col md:flex-row items-center justify-between rounded-[24px] border-[1.5px] border-dashed border-[#c4cddc] bg-white px-[28px] py-[22px] gap-6">
              <div className="flex-1">
                <div className="text-[12px] font-bold tracking-[0.14em] text-[#1769FF] uppercase mb-1">Coming soon</div>
                <h2 className="font-[800] text-[#0f1220] mb-2">Compatible hardware</h2>
                <p className="text-[15px] text-[#5b6478] max-w-[700px]">
                  More safety and telematics hardware for the same vehicle profile. Start with a QR tag and add more when you need it.
                </p>
              </div>
              <a href="#download" className="shrink-0 inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-[#e1e6ee] bg-white px-6 text-[14px] font-bold text-[#0f1220] hover:border-[#1769FF] hover:text-[#1769FF] transition-colors">
                Get the app for updates
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 4) COMPARE BAND */}
      <section 
        className="relative py-[56px] sm:py-[72px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #A3B7FF 0%, #D2DCFF 40%, #F7F9FC 67%, #F7F9FC 100%)'
        }}
      >
        <div className="relative z-10 container-page">
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold uppercase tracking-[0.16em] text-[#1769FF]">COMPARE</span>
          </div>
          <h2 className="font-display font-extrabold text-[#0B1B3F] text-2xl sm:text-3xl lg:text-4xl mb-6">
            Which one is right for you?
          </h2>
          
          <div className="w-full overflow-x-auto rounded-[20px] border border-[#D2DCFF] bg-white shadow-[0_16px_40px_rgba(23,105,255,0.06)]">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D2DCFF]/80" style={{ background: 'linear-gradient(180deg, #D2DCFF 0%, #F7F9FC 100%)' }}>
                  <th className="px-6 py-4 w-[22%]"></th>
                  <th className="px-6 py-4 font-display font-bold text-[16px] text-[#0B1B3F]">QR Safety Tag</th>
                  <th className="px-6 py-4 font-display font-bold text-[16px] text-[#0B1B3F]">GPS Tracker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {[
                  { label: "Its job", qr: "Safety when someone finds your vehicle", gps: "Visibility while your vehicle moves" },
                  { label: "Who uses it", qr: "Anyone who scans it, to reach you privately", gps: "You, and people you choose to share a trip with" },
                  { label: "Alerts", qr: "Calls, messages and reports from scanners", gps: "Geofence and movement alerts" },
                  { label: "App needed", qr: "Not for the scanner. You activate it in the app", gps: "Yes, to activate, view and manage" },
                  { label: "Depends on", qr: "Your privacy settings", gps: "Device and network conditions" }
                ].map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-[#F8FAFF]">
                    <td className="px-6 py-4 text-[13.5px] font-bold text-[#56637F]">{row.label}</td>
                    <td className="px-6 py-4 text-[14.5px] text-[#0B1B3F] leading-relaxed">{row.qr}</td>
                    <td className="px-6 py-4 text-[14.5px] text-[#0B1B3F] leading-relaxed">{row.gps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5) HOW IT WORKS BAND */}
      <section className="bg-[#f7f9fc] py-[48px]">
        <div className="container-page">
          <div className="flex items-center gap-4 mb-[10px]">
            <div className="w-[28px] h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(9.5px,2vw,12px)] font-bold uppercase tracking-[0.16em] text-[#1769FF]">HOW IT WORKS</span>
          </div>
          <h2 className="font-[800] text-[#0f1220] mb-[20px]">From delivery to your dashboard</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
            {[
              { num: "01", title: "Choose your hardware", desc: "Pick a QR Safety Tag, a GPS Tracker, or both." },
              { num: "02", title: "Order in the app", desc: "Checkout, payment and order updates all happen in the carQconnect app." },
              { num: "03", title: "Get it delivered", desc: "Your hardware is shipped to your address." },
              { num: "04", title: "Activate and link", desc: "Scan or enter the device details and link it to your vehicle." },
            ].map(step => (
              <div key={step.num} className="flex flex-col rounded-[20px] bg-white border border-[#CFE0FF] p-[18px]">
                <div className="mb-[10px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1769FF] text-[13px] font-bold text-white">
                  {step.num}
                </div>
                <h3 className="font-bold text-[#0f1220] mb-2">{step.title}</h3>
                <p className="text-[14.5px] leading-[1.6] text-[#5b6478]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6) CLOSING BAND */}
      <section id="download" className="py-[64px] bg-[#f7f9fc]">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[24px] border border-[#ECEEF4] bg-white px-[32px] py-[36px] md:px-[48px] md:py-[40px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_12px_36px_rgba(18,19,26,0.04)]">
            <div className="relative z-10 flex-1">
              <h2 className="font-display font-extrabold text-[#0B1B3F] text-2xl sm:text-3xl mb-[6px]">
                Get the carQconnect app.
              </h2>
              <p className="text-[15px] sm:text-[16px] text-[#56637F] max-w-[520px] leading-relaxed">
                Order hardware, activate it and manage your vehicle from one place.
              </p>
            </div>
            <a 
              href="#download" 
              className="relative z-10 shrink-0 inline-flex min-h-[46px] items-center justify-center rounded-[12px] bg-[#1769FF] px-8 text-[14.5px] font-bold text-white shadow-sm hover:shadow hover:bg-[#0F57DB] transition-all"
            >
              Download App
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}


