import type { Metadata } from "next";
import { QrScannerDemo } from "@/components/qr/qr-scanner-demo";
import { Lock, ShieldOff, Heart, Ban } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = {
  title: "QR Safety",
  description: "How the carQconnect QR works - activation, the public scan experience, masked calling and privacy controls.",
};

const rules = [
  { icon: Lock, title: "Masked calling", description: "Callers reach you without ever seeing your real number." },
  { icon: ShieldOff, title: "Privacy by default", description: "Public scans show only what you've chosen to make visible." },
  { icon: Heart, title: "Optional medical info", description: "Blood group or allergies can be shown to first responders, only if you opt in." },
  { icon: Ban, title: "Abuse protection", description: "Rate limiting and anti-abuse checks protect the public QR page." },
];

export default function QrSafetyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#FFFFFF] pt-[var(--nav-h,64px)] md:pt-[var(--nav-h,76px)] pb-6 md:pb-10 border-b border-[#ECEEF4]">
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(600px 400px at 85% 0%, rgba(23, 105, 255, 0.12), transparent 70%)' }}
        />
        <div className="container-page relative z-10">
          <div className="py-5 md:py-6"><BackButton fallback="/features" label="Back to features" /></div>
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              QR SAFETY
            </span>
          </div>
          
          <h1 
            className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5 max-w-[800px]"
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            A smarter, safer identity for your <span className="text-[#1769FF]">vehicle.</span>
          </h1>
          
          <p className="text-[clamp(15px,1.2vw,17px)] leading-[1.65] text-[#56637F] max-w-[560px] mb-6 md:mb-8">
            The QR is the physical-to-digital bridge at the core of carQconnect. Activate it once, and it works for anyone who needs to reach you about your vehicle.
          </p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[14px]">
            <a href="/#download" className="flex items-center justify-center h-[50px] px-[28px] bg-[#1769FF] text-white text-[14px] font-bold rounded-[12px] shadow-sm hover:shadow hover:bg-[#0F57DB] transition-colors">
              Download App
            </a>
            <a href="#demo" className="flex items-center justify-center h-[50px] px-[28px] bg-white border-[1.5px] border-[#E3E5EC] text-[#0B1B3F] text-[14px] font-bold rounded-[12px] hover:border-[#1769FF] hover:text-[#1769FF] transition-colors">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      <QrScannerDemo />

      <section className="bg-white py-12 md:py-16 border-t border-[#ECEEF4]">
        <div className="container-page">
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              PRIVACY
            </span>
          </div>
          
          <h2 
            className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5"
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            Built around your <span className="text-[#1769FF]">privacy.</span>
          </h2>
          
          <p className="mt-2 mb-10 max-w-[560px] text-[16px] text-[#56637F]">
            Public users never receive private data unless you've explicitly configured it for emergency or public visibility.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rules.map(({ icon: Icon, title, description }) => (
              <div 
                key={title} 
                className="rounded-[22px] border border-[#ECEEF4] bg-white p-6 shadow-[0_10px_30px_rgba(18,19,26,0.05)] transition duration-200 hover:-translate-y-1 hover:border-[#D2DCFF] hover:shadow-[0_18px_44px_rgba(18,19,26,0.08)]"
              >
                <div className="mb-4 flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-[#EAF1FF]">
                  <Icon className="h-[22px] w-[22px] text-[#1769FF]" strokeWidth={1.75} />
                </div>
                
                <h3 className="mb-1.5 font-display text-[17px] font-[800] text-[#0B1B3F]">
                  {title}
                </h3>
                
                <p className="text-[14.5px] leading-relaxed text-[#56637F]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
