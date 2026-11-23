"use client";

import { useEffect, useState } from "react";

export function HeroQrScanner() {
  const [aspectMode, setAspectMode] = useState<"desktop" | "tablet" | "mobile" | "midrange">("desktop");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const lapMq = window.matchMedia("(min-width: 1024px) and (min-aspect-ratio: 6/5)");
    const midMq = window.matchMedia("(min-width: 441px) and (max-width: 767.98px)");
    const mobileMq = window.matchMedia("(max-width: 440.98px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      if (lapMq.matches) {
        setAspectMode("desktop");
      } else if (midMq.matches) {
        setAspectMode("midrange");
      } else if (mobileMq.matches) {
        setAspectMode("mobile");
      } else {
        setAspectMode("tablet");
      }
      setReducedMotion(motionMq.matches);
    };

    update();
    lapMq.addEventListener("change", update);
    midMq.addEventListener("change", update);
    mobileMq.addEventListener("change", update);
    motionMq.addEventListener("change", update);

    return () => {
      lapMq.removeEventListener("change", update);
      midMq.removeEventListener("change", update);
      mobileMq.removeEventListener("change", update);
      motionMq.removeEventListener("change", update);
    };
  }, []);

  const preserveAspect =
    aspectMode === "desktop"
      ? "xMidYMax slice"
      : "xMinYMax slice";

  return (
    <svg
      className="hero-svg pointer-events-none"
      viewBox="0 0 1363 768"
      preserveAspectRatio={preserveAspect}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fade-mask-mobile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="0.08" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.92" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <mask id="hero-mask-mobile">
          <rect x="0" y="0" width="1363" height="768" fill="url(#fade-mask-mobile)" />
        </mask>

        {/* Laser beam unit-space trailing gradient (parallel to QR isometric plane) */}
        <linearGradient id="scan-laser-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1769FF" stopOpacity="0" />
          <stop offset="55%" stopColor="#1769FF" stopOpacity="0.25" />
          <stop offset="88%" stopColor="#60A5FA" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.98" />
        </linearGradient>

        {/* Clip path matching exact isometric unit plane of QR code */}
        <clipPath id="qr-scan-clip">
          <rect x="0" y="0" width="1" height="1" rx="0.04" />
        </clipPath>

        {/* Camera lens softening for background depth of field */}
        <filter id="gps-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>

      {/* Hero background image: Pristine 3D clean showcase with baked-in QR cube */}
      <image
        href="/carqconnect-hero-clean.png"
        width="1363"
        height="768"
        preserveAspectRatio="none"
        mask="url(#hero-mask-mobile)"
        className="hero-image-mobile-only"
        style={{ mixBlendMode: "multiply", imageRendering: "auto" }}
      />
      <image
        href="/carqconnect-hero-clean.png"
        width="1363"
        height="768"
        preserveAspectRatio="none"
        className="hero-image-desktop-only"
        style={{ imageRendering: "auto" }}
      />

      {/* GPS Tile on Left White Box - Exactly centered in groove, parallel isometric alignment */}
      <g filter="url(#gps-blur)">
        <g id="gps-device-tile" transform="translate(168 285) matrix(84 56 -84 56 0 -56)">
          {/* Subtle contact shadow */}
          <rect x="0.04" y="0.04" width="0.92" height="0.92" rx="0.14" fill="rgba(11,27,63,0.18)" />

          {/* Deep navy rounded base plate fitting the depression */}
          <rect
            x="0.06"
            y="0.06"
            width="0.88"
            height="0.88"
            rx="0.12"
            fill="#0B1B3F"
            stroke="rgba(23,105,255,0.4)"
            strokeWidth="0.02"
          />

          {/* Inner display bezel */}
          <rect
            x="0.10"
            y="0.10"
            width="0.80"
            height="0.80"
            rx="0.09"
            fill="#0E1E45"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.01"
          />

          {/* Subtle radar / map coordinate grid */}
          <g stroke="rgba(163,183,255,0.18)" strokeWidth="0.012" fill="none">
            <path d="M0.28 0.10v0.80 M0.50 0.10v0.80 M0.72 0.10v0.80 M0.10 0.28h0.80 M0.10 0.50h0.80 M0.10 0.72h0.80" />
          </g>

          {/* Glowing animated GPS tracking route */}
          <path
            d="M0.22 0.78 V0.55 H0.50"
            fill="none"
            stroke="#1769FF"
            strokeWidth="0.026"
            strokeLinecap="round"
            strokeDasharray="0.045 0.045"
            opacity="0.95"
          >
            {!reducedMotion && (
              <animate attributeName="stroke-dashoffset" values="0;-0.18" dur="2s" repeatCount="indefinite" />
            )}
          </path>

          {/* Animated GPS Radar Pulse */}
          <circle cx="0.50" cy="0.55" r="0.035" fill="none" stroke="#1769FF" strokeWidth="0.02" opacity="0">
            {!reducedMotion && (
              <>
                <animate attributeName="r" values="0.035; 0.26" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85; 0" dur="2.4s" repeatCount="indefinite" />
              </>
            )}
          </circle>

          {/* High-tech GPS Location Pin */}
          <path
            d="M0.50 0.58 C0.50 0.58 0.38 0.45 0.38 0.37 C0.38 0.29 0.43 0.24 0.50 0.24 C0.57 0.24 0.62 0.29 0.62 0.37 C0.62 0.45 0.50 0.58 0.50 0.58 Z"
            fill="#1769FF"
          />
          <circle cx="0.50" cy="0.37" r="0.04" fill="#FFFFFF" />

          {/* Blue corner brackets */}
          <g fill="none" stroke="#1769FF" strokeWidth="0.022" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
            <path d="M0.16 0.24 V0.16 H0.24 M0.76 0.16 H0.84 V0.24 M0.84 0.76 V0.84 H0.76 M0.24 0.84 H0.16 V0.76" />
          </g>
        </g>
      </g>

      {/* Laser Scanner Animation Sweeping Back & Forth in Arrow Direction (Bottom-Left to Top-Right) */}
      <g transform="matrix(86 58 90 -61 330 416)">
        <g clipPath="url(#qr-scan-clip)">
          <g>
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 -0.28; 0 1.08; 0 1.08; 0 -0.28"
                keyTimes="0; 0.46; 0.54; 1"
                dur="2.8s"
                repeatCount="indefinite"
              />
            )}
            {/* Trailing laser wash / gradient */}
            <rect x="-0.15" y="-0.28" width="1.3" height="0.28" fill="url(#scan-laser-grad)" />
            {/* Bright laser line parallel to QR isometric axis */}
            <line x1="-0.15" y1="0" x2="1.15" y2="0" stroke="#FFFFFF" strokeWidth="0.022" opacity="0.98" />
            <line x1="-0.15" y1="0" x2="1.15" y2="0" stroke="#1769FF" strokeWidth="0.05" opacity="0.75" />
          </g>
        </g>
      </g>

    </svg>
  );
}
