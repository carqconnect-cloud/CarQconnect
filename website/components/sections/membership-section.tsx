import { SectionHeading } from "@/components/ui/section-heading";
import { MembershipCard } from "@/components/product/membership-card";
import { Button } from "@/components/ui/button";
import { plans } from "@/lib/data/plans";

export function MembershipSection() {
  return (
    <section className="bg-[#F7F9FC] py-20 md:py-28 border-y border-[#E2E8F0]">
      <div className="container-page">
        <SectionHeading
          align="center"
          title="More protection. More possibilities."
          description="Membership unlocks deeper entitlements across safety, GPS and trip intelligence — as an ecosystem benefit, not a bolt-on subscription."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <MembershipCard key={plan.slug} plan={plan} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button href="/membership" variant="ghost">
            Compare all plans
          </Button>
        </div>
      </div>
    </section>
  );
}
