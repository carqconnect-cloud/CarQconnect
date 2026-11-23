'use client';

import { useState } from "react";
import { Navigation } from "lucide-react";

export function TripPlannerDemo() {
  const [preference, setPreference] = useState<"Fastest" | "Economical" | "Lower toll">("Economical");

  const isFastest = preference === "Fastest";
  const isLowerToll = preference === "Lower toll";

  const distance = isLowerToll ? "638 km" : "612 km";
  const duration = isFastest ? "~8h 55m" : isLowerToll ? "~10h 20m" : "~9h 40m";
  const fuelLiters = isFastest ? "~44 L" : isLowerToll ? "~43 L" : "~41 L";
  const fuelCost = isFastest ? "₹4,580" : isLowerToll ? "₹4,470" : "₹4,270";
  const tollCost = isFastest ? "₹1,940" : isLowerToll ? "₹820" : "₹1,680";
  const totalCost = isFastest ? "₹6,520" : isLowerToll ? "₹5,290" : "₹5,950";
  const perKm = isFastest ? "~₹10.6" : isLowerToll ? "~₹8.3" : "~₹8.1";

  return (
    <div className="w-full max-w-[680px] mr-auto bg-white rounded-[20px] border border-[#D2DCFF] shadow-[0_12px_32px_rgba(11,27,63,0.06)] p-5 sm:p-6 font-sans">
      {/* Route Inputs Form */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* From Input */}
          <div className="flex items-center gap-2.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus-within:border-[#1769FF] focus-within:bg-white transition-all">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0 ring-3 ring-[#10B981]/15" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-[#56637F] uppercase tracking-wider">From (Origin)</label>
              <input 
                type="text" 
                defaultValue="Indore, MP" 
                className="w-full bg-transparent text-[#0B1B3F] font-bold text-[14px] outline-none" 
                readOnly 
              />
            </div>
          </div>

          {/* To Input */}
          <div className="flex items-center gap-2.5 bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus-within:border-[#1769FF] focus-within:bg-white transition-all">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0 ring-3 ring-[#EF4444]/15" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-[#56637F] uppercase tracking-wider">To (Destination)</label>
              <input 
                type="text" 
                defaultValue="Udaipur, RJ" 
                className="w-full bg-transparent text-[#0B1B3F] font-bold text-[14px] outline-none" 
                readOnly 
              />
            </div>
          </div>
        </div>

        {/* Route Preference Selector Form Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#56637F]">Route Preference:</span>
            <div className="inline-flex p-0.5 bg-[#F1F4F9] rounded-lg gap-0.5 border border-[#E2E8F0]">
              {(["Fastest", "Economical", "Lower toll"] as const).map((pref) => {
                const isSelected = preference === pref;
                return (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setPreference(pref)}
                    className={`px-3 py-1 rounded-md text-[12px] transition-all ${
                      isSelected 
                        ? "bg-[#1769FF] text-white shadow-xs font-semibold" 
                        : "text-[#56637F] hover:text-[#0B1B3F] font-medium"
                    }`}
                  >
                    {pref}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-[#56637F] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>Live FASTag & fuel prices</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-[#E2E8F0]" />

      {/* Unified Trip Estimate Breakdown Form Panel */}
      <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-xl p-4 sm:p-5">
        <div className="text-[12px] font-bold text-[#0B1B3F] mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-[#1769FF]" />
            <span>Estimated Trip Breakdown</span>
          </div>
          <span className="text-[11px] font-medium text-[#56637F]">Vehicle: 14.8 km/l Petrol</span>
        </div>

        {/* Clean Form Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3.5 border-b border-[#E2E8F0]">
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Distance</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{distance}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Travel Time</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{duration}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Fuel Needed</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{fuelLiters} <span className="text-[11px] font-normal text-[#56637F]">(est.)</span></p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Fuel Cost</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{fuelCost}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Toll Estimate</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{tollCost}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#56637F] uppercase tracking-wide">Cost Per Km</p>
            <p className="text-[15px] font-bold text-[#0B1B3F] mt-0.5">{perKm} / km</p>
          </div>
        </div>

        {/* Total Cost Highlight Strip */}
        <div className="mt-3 flex flex-row items-center justify-between gap-3 pt-0.5">
          <div>
            <span className="text-[13px] font-bold text-[#0B1B3F]">Total Estimated Cost</span>
            <p className="text-[11px] text-[#56637F]">Includes fuel consumption & FASTag tolls</p>
          </div>
          <div>
            <span className="text-[22px] font-extrabold text-[#1769FF]">{totalCost}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[#718096] text-center sm:text-left leading-relaxed">
        * Fuel and toll estimates are calculated dynamically based on real-time highway conditions.
      </p>
    </div>
  );
}
