import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { QrCode, MapPin, Route, Headset, CheckCircle2, Zap, Crown, Lock, Smartphone, ArrowRightLeft } from "lucide-react";
import { getRealMembershipPlans } from "@/lib/data/membershipPlans";

export const metadata: Metadata = {
  title: "Membership",
  description: "View carQconnect membership plans to unlock advanced vehicle features.",
};

export default async function MembershipPage() {
  const plans = await getRealMembershipPlans();
  return (
    <div className="font-display text-[#0B1B3F] bg-white min-h-[100svh]">
      
      {/* 1. HERO SECTION */}
      <section 
        className="pt-[var(--nav-h,64px)] md:pt-[var(--nav-h,76px)] pb-[40px] relative border-b border-[#E2E8F0]"
        style={{ background: 'var(--bg-gradient)' }}
      >
        <div className="container-page flex flex-col items-center text-center relative z-10">
          <div className="w-full flex justify-start py-5 md:py-6"><BackButton fallback="/features" label="Back to features" /></div>
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              MEMBERSHIP
            </span>
            <div className="w-8 h-[2px] bg-[#1769FF]" />
          </div>
          
          <h1 
            className="font-display font-extrabold text-[#0B1B3F] max-w-[800px] mb-4 sm:mb-5" 
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            Membership that grows with <span className="text-[#1769FF]">your drive.</span>
          </h1>
          
          <p className="text-[17px] text-[#56637F] max-w-[560px] leading-relaxed mb-8 font-medium">
            Membership unlocks features across QR safety, GPS, trip intelligence and support. View plans and manage yours in the carQconnect app.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="#plans" 
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-[12px] bg-[#1769FF] px-8 text-[15px] font-[800] text-white shadow-sm hover:shadow hover:bg-[#0F57DB] transition-all"
            >
              View Plans
            </Link>
            <Link 
              href="/contact" 
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-[12px] border border-[#D2DCFF] bg-white px-8 text-[15px] font-[800] text-[#0B1B3F] hover:border-[#1769FF] hover:text-[#1769FF] transition-all shadow-xs"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PLAN CARDS SECTION */}
      <section id="plans" className="pt-[40px] pb-[60px] relative overflow-hidden scroll-mt-24 bg-white">
        <div className="container-page relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              PLANS
            </span>
            <div className="w-8 h-[2px] bg-[#1769FF]" />
          </div>
          
          <h2 
            className="font-display font-extrabold text-[#0B1B3F] mb-4 sm:mb-5 text-center"
            style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
          >
            Choose your <span className="text-[#1769FF]">plan.</span>
          </h2>
          <p className="text-[#56637F] text-[16px] text-center max-w-[500px] mb-8 leading-relaxed font-medium">
            Start with essential safety, upgrade whenever you need tracking and smarter trips.
          </p>

          <div className="flex items-center bg-[#EAEFF9] rounded-full p-1.5 border border-[#D2DCFF] mb-10 shadow-xs">
            <button className="bg-white text-[#0B1B3F] px-6 py-2 rounded-full text-[14px] font-[800] flex items-center gap-2 shadow-sm">
              Yearly <span className="bg-[#1769FF] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-[800]">Save up to 37%</span>
            </button>
            <button className="text-[#56637F] px-6 py-2 rounded-full text-[14px] font-[800] hover:text-[#0B1B3F] transition-colors">
              Monthly
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 items-stretch">
            {plans.map((plan) => {
              const isPopular = plan.isPopular;
              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col bg-white rounded-[22px] p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 ${
                    isPopular 
                      ? "border-2 border-[#1769FF] shadow-[0_16px_40px_rgba(23,105,255,0.14)] z-10" 
                      : "border border-[#D2DCFF] shadow-[0_8px_24px_rgba(11,27,63,0.05)] hover:shadow-[0_16px_36px_rgba(11,27,63,0.09)] hover:border-[#1769FF]/50"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1769FF] text-white text-[10px] font-[800] uppercase tracking-[0.1em] px-3.5 py-1 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-2 mt-1">
                    <div className="w-[30px] h-[30px] rounded-xl bg-[#EAF1FF] text-[#1769FF] flex items-center justify-center shrink-0">
                      {plan.id === 'free' && <div className="w-[8px] h-[8px] rounded-full bg-[#1769FF]" />}
                      {plan.id === 'basic' && <Zap className="w-[14px] h-[14px]" fill="currentColor" />}
                      {plan.id === 'premium' && <Crown className="w-[14px] h-[14px]" fill="currentColor" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-[800] text-[#0B1B3F] text-[18px] sm:text-[20px]">{plan.name}</h3>
                      {plan.badge && (
                        <span className="bg-[#1769FF]/10 text-[#1769FF] border border-[#1769FF]/20 text-[9px] font-[800] uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-[13px] text-[#56637F] mb-4 min-h-0 sm:min-h-[38px] leading-snug">
                    {plan.description}
                  </p>
                  
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[30px] sm:text-[34px] font-[800] text-[#0B1B3F] tracking-tight">₹{plan.monthlyPrice}</span>
                    <span className="text-[13px] font-medium text-[#56637F]">/ month</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-5 text-[12px] font-medium">
                    <span className="text-[#56637F]">{plan.billedYearly}</span>
                    <span className="text-[#059669] font-bold">{plan.savings}</span>
                  </div>
                  
                  <Link 
                    href="/#download"
                    className={`inline-flex min-h-[42px] w-full items-center justify-center rounded-[12px] text-[13px] font-[800] transition-all mb-5 ${
                      isPopular 
                        ? "bg-[#1769FF] text-white hover:bg-[#0F57DB] shadow-sm hover:shadow" 
                        : "bg-[#F7F9FC] border border-[#D2DCFF] text-[#0B1B3F] hover:border-[#1769FF] hover:text-[#1769FF] hover:bg-white"
                    }`}
                  >
                    {plan.id === 'free' ? 'Get Started' : `Get ${plan.name}`}
                  </Link>

                  <div className="w-full h-[1px] bg-[#E2E8F0] mb-4" />
                  
                  <div className="text-[10px] font-[800] tracking-[0.1em] text-[#56637F] uppercase mb-3">
                    What's included
                  </div>

                  <div className="flex flex-col gap-3 flex-grow">
                    {plan.entitlements.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <div className="w-[18px] h-[18px] rounded-full bg-[#10B981]/15 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-[12px] h-[12px]" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full bg-[#F1F4F9] border border-[#E2E8F0] flex items-center justify-center shrink-0 mt-0.5">
                            <div className="w-[6px] h-[2px] bg-[#94A3B8]" />
                          </div>
                        )}
                        <div className="flex flex-col -mt-0.5">
                          <span className={`text-[13px] font-[800] leading-tight ${feature.included ? 'text-[#0B1B3F]' : 'text-[#94A3B8]'}`}>
                            {feature.name}
                          </span>
                          <span className={`text-[12px] font-medium leading-snug mt-0.5 ${feature.included ? 'text-[#56637F]' : 'text-[#94A3B8]'}`}>
                            {feature.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#56637F]">
              <Lock className="w-[14px] h-[14px] text-[#1769FF]" /> Secure payments
            </div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#56637F]">
              <Smartphone className="w-[14px] h-[14px] text-[#1769FF]" /> Manage in the app
            </div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#56637F]">
              <ArrowRightLeft className="w-[14px] h-[14px] text-[#1769FF]" /> Upgrade or downgrade anytime
            </div>
          </div>
          
          <p className="text-center text-[#718096] text-[12px] font-medium max-w-[600px]">
            Prices are inclusive of applicable taxes where relevant. Final pricing is shown in the app.
          </p>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="py-[60px] relative bg-white border-y border-[#E2E8F0]">
        <div className="container-page">
          <h2 className="font-[800] mb-8 text-center text-[#0B1B3F]" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)' }}>How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "01", text: "View plans in the app" },
              { num: "02", text: "Compare benefits" },
              { num: "03", text: "Purchase or renew in the app" },
            ].map((step) => (
              <div key={step.num} className="bg-gradient-to-br from-[#F7F9FC] to-[#EAF1FF] rounded-[22px] p-[28px] border border-[#D2DCFF] shadow-[0_4px_20px_rgba(11,27,63,0.03)] flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(23,105,255,0.1)] hover:border-[#1769FF]">
                <div className="w-[42px] h-[42px] rounded-full bg-[#1769FF] text-white flex items-center justify-center text-[15px] font-[800] mb-4 shadow-sm">
                  {step.num}
                </div>
                <h3 className="font-[800] text-[#0B1B3F] text-[17px]">{step.text}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. WHERE MEMBERSHIP APPLIES */}
      <section className="py-[60px] relative bg-[#F7F9FC]">
        <div className="container-page">
          <h2 className="font-[800] mb-3 text-center text-[#0B1B3F]" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)' }}>Where membership applies</h2>
          <p className="text-[#56637F] text-[16px] text-center mb-10 font-medium">One membership, four areas of your connected drive.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { 
                icon: QrCode, 
                title: "QR Safety", 
                desc: "Safety features for your vehicle's QR.", 
                bullets: ["Masked owner calls", "Privacy controls", "Scan activity"],
                tag: "ALL PLANS",
                isActive: true
              },
              { 
                icon: MapPin, 
                title: "GPS", 
                desc: "Tracking features for your connected device.", 
                bullets: ["Live location", "Geofence alerts", "Trip history"],
                tag: "PLUS & PRO",
                isActive: false
              },
              { 
                icon: Route, 
                title: "Trip Intelligence", 
                desc: "Smarter trip planning and estimates.", 
                bullets: ["Fuel & toll estimates", "Route options", "Stops & stays"],
                tag: "PLUS & PRO",
                isActive: false
              },
              { 
                icon: Headset, 
                title: "Support", 
                desc: "Help when you need it.", 
                bullets: ["AI chat help", "Human escalation", "Priority queue"],
                tag: "PRIORITY ON PRO",
                isActive: false
              },
            ].map((item) => (
              <div 
                key={item.title} 
                className={`relative bg-white rounded-[22px] p-6 border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#1769FF] hover:shadow-[0_12px_32px_rgba(11,27,63,0.08)] ${item.isActive ? 'border-[#1769FF] shadow-[0_8px_24px_rgba(23,105,255,0.08)]' : 'border-[#D2DCFF] shadow-xs'}`}
              >
                {item.isActive && (
                  <div className="absolute top-0 left-8 w-[32px] h-[3px] bg-[#1769FF] rounded-b-full" />
                )}
                
                <div className="w-[42px] h-[42px] rounded-[12px] bg-[#EAF1FF] text-[#1769FF] flex items-center justify-center mb-4 mt-1">
                  <item.icon className="w-[20px] h-[20px]" strokeWidth={2.2} />
                </div>
                
                <h3 className="font-[800] text-[#0B1B3F] text-[17px] mb-1.5">{item.title}</h3>
                <p className="text-[13.5px] text-[#56637F] mb-5 leading-relaxed min-h-[40px]">{item.desc}</p>
                
                <ul className="flex flex-col gap-2.5 mb-6 flex-grow">
                  {item.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <div className="w-[5px] h-[5px] rounded-full bg-[#1769FF] shrink-0" />
                      <span className="text-[13.5px] font-medium text-[#0B1B3F]">{bullet}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-auto">
                  <span className="inline-flex bg-[#EAF1FF] border border-[#D2DCFF] text-[#1769FF] text-[10px] font-[800] uppercase tracking-[0.1em] px-3 py-1.5 rounded-full">
                    {item.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MANAGE IT IN THE APP */}
      <section className="py-[70px] bg-[#EAF1FF] border-t border-[#D2DCFF] text-[#0B1B3F]">
        <div className="container-page text-center flex flex-col items-center">
          <h2 className="font-[800] mb-8" style={{ fontSize: 'clamp(26px, 3.5vw, 36px)' }}>Manage it in the app</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-4">
            {[
              "Renew your membership",
              "Upgrade or downgrade your plan",
              "See your transaction history"
            ].map(point => (
              <div key={point} className="flex items-center gap-3">
                <CheckCircle2 className="w-[20px] h-[20px] text-[#1769FF]" />
                <span className="text-[16px] font-semibold text-[#0B1B3F]">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
