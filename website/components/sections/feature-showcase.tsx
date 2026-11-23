"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Central image paths constant: update here without modifying styles
export const TAB_IMAGES = {
  // Recommended minimum size: 1200x900 light-style map screenshot
  gps: "/images/gps.png",
  qrSafety: "/images/qr-safety-tag.png",
  hardware: "/images/hardware.png",
};

const features = [
  {
    id: "qr-safety",
    tabLabel: "QR safety tag",
    title: "A secure way to reach the vehicle owner.",
    description:
      "A scan opens a privacy-first mobile page. Call, message, report an issue or use the emergency action - without exposing the owner's phone number.",
    capabilities: [
      "No app required for the scanner",
      "Masked owner contact",
      "Parking and emergency reporting",
    ],
    buttonText: "Explore QR Safety",
    href: "/qr-safety",
    statusText: "Active QR tag · Masked owner calling",
    image: TAB_IMAGES.qrSafety,
  },
  {
    id: "gps",
    tabLabel: "Live GPS",
    title: "Know where your vehicle is, when it matters.",
    description:
      "Connect a compatible tracker for live location, last-seen status, trip history and geofence alerts. Clear status, not confusing dashboards.",
    capabilities: [
      "Live location and last seen",
      "Trip history and geofences",
      "Movement and device alerts",
    ],
    buttonText: "Explore GPS",
    href: "/gps",
    statusText: "Mahalaxmi Nagar · Last seen 2 min ago",
    image: TAB_IMAGES.gps,
  },
  {
    id: "hardware",
    tabLabel: "Hardware",
    title: "The right hardware for every drive.",
    description:
      "Choose a QR tag or GPS tracker, with more compatible hardware to follow. Activate each device in the app and link it to your vehicle.",
    capabilities: [
      "QR tags and GPS tracking devices",
      "Activate in the app, linked to one vehicle",
      "Built for future compatible hardware",
    ],
    buttonText: "View hardware",
    href: "/marketplace",
    statusText: "Connected devices · All systems operational",
    image: TAB_IMAGES.hardware,
  },
];

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      handleTabChange((activeIndex + 1) % features.length);
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeIndex]);

  const handleTabChange = (newIndex: number) => {
    if (newIndex === activeIndex) return;
    setAnimating(true);
    setTimeout(() => {
      setActiveIndex(newIndex);
      setAnimating(false);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIdx = (idx + 1) % features.length;
      buttonRefs.current[nextIdx]?.focus();
      handleTabChange(nextIdx);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIdx = (idx - 1 + features.length) % features.length;
      buttonRefs.current[prevIdx]?.focus();
      handleTabChange(prevIdx);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabChange(idx);
      setIsPaused(true);
    }
  };

  const activeFeature = features[activeIndex];

  return (
    <div
      className="w-full flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .feature-showcase-card {
          background: #F7F9FC;
          border: 1px solid rgba(23, 105, 255, 0.16);
          border-top: 3px solid #1769FF;
          border-radius: 26px;
          box-shadow: 0 22px 50px rgba(23, 105, 255, 0.10);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr;
        }

        @media (min-width: 860px) {
          .feature-showcase-card {
            grid-template-columns: 1fr 1fr;
            align-items: stretch;
          }
        }

        .media-panel-container {
          margin: 14px;
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          min-height: 440px;
          border: 1px solid rgba(23, 105, 255, 0.16);
        }

        @media (max-width: 859px) {
          .media-panel-container {
            min-height: 320px;
            margin: 12px;
          }
        }

        @keyframes gpsPulseRing {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          70% {
            transform: scale(2.4);
            opacity: 0;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }

        .gps-marker-ring {
          animation: gpsPulseRing 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .gps-marker-ring {
            animation: none !important;
            opacity: 0.45;
          }
        }

        /* Map filter - remove once /images/gps.png is replaced with light 1200x900 screenshot */
        .map-light-filter {
          filter: invert(1) hue-rotate(180deg) brightness(1.08) saturate(0.7);
        }
      `,
        }}
      />

      {/* TABS CONTAINER */}
      <div
        role="tablist"
        aria-label="Vehicle platform features"
        className="flex overflow-x-auto scrollbar-none relative p-1.5 mb-5 rounded-[14px] bg-[#F7F9FC] border border-[rgba(23,105,255,0.16)] w-full max-w-[500px]"
        style={{ backdropFilter: "blur(8px)" }}
      >
        {features.map((feature, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={feature.id}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${feature.id}`}
              id={`tab-${feature.id}`}
              onClick={() => {
                handleTabChange(idx);
                setIsPaused(true);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "whitespace-nowrap transition-all flex-1 min-w-max flex items-center justify-center text-[13px] sm:text-[14px] font-bold px-4 py-2.5 rounded-[10px] min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1769FF]"
              )}
              style={{
                color: isActive ? "#FFFFFF" : "rgba(11, 27, 63, 0.7)",
                backgroundColor: isActive ? "#1769FF" : "transparent",
                boxShadow: isActive ? "0 4px 14px rgba(23, 105, 255, 0.28)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "#0B1B3F";
                  e.currentTarget.style.backgroundColor = "rgba(23, 105, 255, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "rgba(11, 27, 63, 0.7)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {feature.tabLabel}
            </button>
          );
        })}
      </div>

      {/* FEATURE CARD */}
      <div
        id={`panel-${activeFeature.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeFeature.id}`}
        className={cn(
          "feature-showcase-card transition-all duration-200 ease-in-out motion-reduce:transition-none",
          animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
        )}
      >
        {/* LEFT COLUMN: Text and Actions */}
        <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <h3
              className="font-display font-bold text-[#0B1B3F]"
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                textWrap: "balance",
              }}
            >
              {activeFeature.title}
            </h3>

            {/* Heading-to-paragraph gap: exactly 14px */}
            <p
              className="text-[15px] sm:text-[16px] leading-[1.6]"
              style={{
                color: "rgba(11, 27, 63, 0.7)",
                marginTop: "14px",
                marginBottom: "24px",
                maxWidth: "52ch",
              }}
            >
              {activeFeature.description}
            </p>

            {/* Capabilities list */}
            <ul className="flex flex-col gap-3 mb-8">
              {activeFeature.capabilities.map((cap, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-[14px] sm:text-[15px] font-bold text-[#0B1B3F]"
                >
                  <CheckCircle2
                    className="shrink-0 w-5 h-5 text-[#1769FF]"
                    strokeWidth={2.5}
                  />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={activeFeature.href}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#1769FF] text-white font-bold text-[14px] sm:text-[15px] px-6 py-3.5 w-fit shadow-[0_8px_20px_rgba(23,105,255,0.28)] hover:brightness-[1.08] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1769FF]"
          >
            {activeFeature.buttonText} &rarr;
          </Link>
        </div>

        {/* RIGHT COLUMN: Media Panel */}
        <div
          className="media-panel-container flex items-center justify-center"
          style={{
            background:
              activeFeature.id === "gps"
                ? "#F7F9FC"
                : "linear-gradient(180deg, #D2DCFF 0%, #F7F9FC 100%)",
          }}
        >
          {/* TAB 1 & 3: QR Safety & Hardware center images */}
          {activeFeature.id !== "gps" && (
            <div className="relative flex items-center justify-center w-full h-full p-6">
              <img
                src={activeFeature.image}
                alt={activeFeature.title}
                className="block select-none"
                style={{
                  maxWidth: "78%",
                  maxHeight: "86%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 18px 40px rgba(23, 105, 255, 0.18))",
                }}
              />
            </div>
          )}

          {/* TAB 2: Live GPS map as full panel background */}
          {activeFeature.id === "gps" && (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img
                src={activeFeature.image}
                alt="carQconnect Live GPS Map"
                className="w-full h-full object-cover object-center map-light-filter"
              />

              {/* Light tint overlay for map harmonization */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: "#D2DCFF",
                  mixBlendMode: "multiply",
                  opacity: 0.35,
                }}
              />

              {/* Pulsing GPS Marker (Default: left 58%, top 46%) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                style={{ left: "58%", top: "46%" }}
                aria-label="Vehicle GPS location pin"
              >
                {/* Outer pulsing ring */}
                <div
                  className="gps-marker-ring absolute -inset-3 rounded-full"
                  style={{
                    backgroundColor: "rgba(23, 105, 255, 0.45)",
                  }}
                />
                {/* Center 18px marker circle */}
                <div
                  className="relative w-[18px] h-[18px] rounded-full bg-[#1769FF]"
                  style={{
                    border: "3px solid #FFFFFF",
                    boxShadow: "0 4px 14px rgba(23, 105, 255, 0.4)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Bottom fade overlay (45% height) */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
            style={{
              height: "45%",
              background:
                "linear-gradient(180deg, rgba(247,249,252,0) 0%, rgba(247,249,252,0.55) 100%)",
            }}
          />

          {/* OVERLAY: Top-Left Chip */}
          <div
            className="absolute top-[18px] left-[18px] z-20 flex items-center rounded-full px-3.5 py-1.5 border border-[rgba(23,105,255,0.16)] shadow-[0_8px_20px_rgba(23,105,255,0.14)]"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[13px] font-semibold text-[#0B1B3F]">
              {activeFeature.tabLabel}
            </span>
          </div>

          {/* OVERLAY: Bottom-Left Chip */}
          <div
            className="absolute bottom-[18px] left-[18px] z-20 flex items-center gap-2 rounded-full px-3.5 py-1.5 border border-[rgba(23,105,255,0.16)] shadow-[0_8px_20px_rgba(23,105,255,0.14)] max-w-[calc(100%-88px)]"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[13px] font-semibold text-[#0B1B3F] truncate">
              {activeFeature.statusText}
            </span>
          </div>

          {/* OVERLAY: Bottom-Right 44px circular button */}
          <Link
            href={activeFeature.href}
            aria-label={`Go to ${activeFeature.tabLabel}`}
            className="absolute bottom-[18px] right-[18px] z-20 flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#1769FF] text-white shadow-[0_8px_20px_rgba(23,105,255,0.30)] hover:brightness-[1.12] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1769FF]"
          >
            <ArrowUpRight className="w-5 h-5 text-white" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
