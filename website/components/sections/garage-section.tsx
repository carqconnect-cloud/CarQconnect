import { SectionHeading } from "@/components/ui/section-heading";
import { Car, Bike, Truck } from "lucide-react";

const vehicles = [
  {
    icon: Car,
    name: "Family SUV",
    reg: "MP09 XX 1234",
    fuel: "Petrol",
    mileage: "13.2 km/l",
    qr: "Active",
    gps: "Connected",
  },
  {
    icon: Truck,
    name: "Daily Sedan",
    reg: "MP09 XX 5678",
    fuel: "Diesel",
    mileage: "17.8 km/l",
    qr: "Active",
    gps: "Not linked",
  },
  {
    icon: Bike,
    name: "City Bike",
    reg: "MP09 XX 9012",
    fuel: "Petrol",
    mileage: "45 km/l",
    qr: "Not activated",
    gps: "Not linked",
  },
];

export function GarageSection() {
  return (
    <section className="bg-[#F7F9FC] py-14 sm:py-20 border-y border-[#E2E8F0]">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <SectionHeading
            title="Everything about your vehicles, in one place."
            description="Documents, service reminders, trip history and fuel logs — organized by vehicle in your Digital Garage."
          />
          <span className="self-start sm:self-end text-[11px] font-semibold text-[#56637F] bg-white border border-[#D2DCFF] px-2.5 py-1 rounded-full shadow-xs">
            Sample data
          </span>
        </div>

        {/* 3 Compact Cards in a Row using Flex */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch w-full">
          {vehicles.map((v) => {
            const isQrActive = v.qr === "Active";
            return (
              <div 
                key={v.reg} 
                className="flex-1 min-w-0 bg-white rounded-[20px] border border-[#D2DCFF] p-5 sm:p-6 shadow-[0_8px_24px_rgba(11,27,63,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#1769FF] hover:shadow-[0_16px_36px_rgba(23,105,255,0.12)] flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Icon & QR Status */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1769FF]">
                      <v.icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                        isQrActive
                          ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#059669]"
                          : "border-[#E2E8F0] bg-[#F1F4F9] text-[#64748B]"
                      }`}
                    >
                      QR {v.qr}
                    </span>
                  </div>

                  {/* Vehicle Name & Reg */}
                  <h3 className="font-display font-extrabold text-[#0B1B3F] text-[18px] leading-snug">
                    {v.name}
                  </h3>
                  <p className="text-[13px] font-medium text-[#56637F] mt-0.5">{v.reg}</p>
                </div>

                {/* 2x2 Specs Grid */}
                <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] border-t border-[#E2E8F0] pt-4">
                  <div>
                    <p className="text-[#56637F] font-medium text-[11px] uppercase tracking-wide">Fuel type</p>
                    <p className="mt-0.5 font-bold text-[#0B1B3F] text-[13px]">{v.fuel}</p>
                  </div>
                  <div>
                    <p className="text-[#56637F] font-medium text-[11px] uppercase tracking-wide">Mileage</p>
                    <p className="mt-0.5 font-bold text-[#0B1B3F] text-[13px]">{v.mileage}</p>
                  </div>
                  <div>
                    <p className="text-[#56637F] font-medium text-[11px] uppercase tracking-wide">GPS</p>
                    <p className="mt-0.5 font-bold text-[#0B1B3F] text-[13px]">{v.gps}</p>
                  </div>
                  <div>
                    <p className="text-[#56637F] font-medium text-[11px] uppercase tracking-wide">Documents</p>
                    <p className="mt-0.5 font-bold text-[#0B1B3F] text-[13px]">Up to date</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
