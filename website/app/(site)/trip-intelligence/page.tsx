import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/page-header";
import { BackButton } from "@/components/ui/back-button";
import { TripPlannerDemo } from "@/components/product/trip-planner-demo";
import { AiSection } from "@/components/sections/ai-section";
import { VoiceSection } from "@/components/sections/voice-section";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Trip Intelligence",
  description: "Route, fuel and toll estimation, stop recommendations and route comparison — planned around your vehicle's mileage and fuel type.",
};

export default function TripIntelligencePage() {
  return (
    <>
      <PageHeader
        backButton={<BackButton fallback="/features" label="Back to features" />}
        eyebrow="TRIP INTELLIGENCE"
        title={<>Every journey, <span className="text-[#1769FF]">planned intelligently.</span></>}
        description="carQconnect reads your vehicle's exact mileage, fuel type, and real-time highway conditions to calculate accurate travel time, fuel consumption, and toll expenses. Plan seamless multi-stop journeys with verified highway petrol pumps, certified EV charging points, top-rated food stops, and safe rest areas tailored to your route."
        className="relative overflow-hidden pb-0"
      />

      <section className="bg-background" style={{ paddingBottom: 'clamp(24px, 4vw, 40px)', paddingTop: 'clamp(32px, 5vw, 48px)' }}>
        <div className="container-page">
          <div style={{ marginBottom: 'clamp(8px, 1.5vw, 16px)' }}>
            <SectionHeading
              title="Plan a trip"
              description="Distance, duration, fuel and toll estimates update as you change route preferences."
            />
          </div>
          <TripPlannerDemo />
        </div>
      </section>

      <AiSection />
      <VoiceSection />
    </>
  );
}
