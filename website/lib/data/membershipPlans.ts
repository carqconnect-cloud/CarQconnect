export type MembershipPlan = {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: string;
  billedYearly: string;
  savings: string;
  isPopular?: boolean;
  entitlements: { name: string; description: string; included: boolean }[];
};

export const defaultMembershipPlans: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with essential vehicle telemetry and basic document protection.",
    monthlyPrice: "0",
    billedYearly: "Free forever",
    savings: "No card required",
    entitlements: [
      { name: "Vehicle Profile", description: "1 Vehicle", included: true },
      { name: "Basic Service Reminders", description: "Standard alerts", included: true },
      { name: "Document Storage", description: "5 files", included: true },
      { name: "Service History & Analytics", description: "Available on higher plans", included: false },
      { name: "Priority Support", description: "Faster human assistance", included: false },
      { name: "Exclusive Offers", description: "Discounts & member perks", included: false },
    ]
  },
  {
    id: "basic",
    name: "Basic",
    description: "More convenience for everyday drivers.",
    monthlyPrice: "49",
    billedYearly: "Billed ₹392 yearly",
    savings: "Save ₹196",
    entitlements: [
      { name: "Vehicle Profile", description: "Up to 3 vehicles", included: true },
      { name: "All Reminders", description: "Service, PUC, insurance & FASTag", included: true },
      { name: "Document Storage", description: "15 files", included: true },
      { name: "Service History & Analytics", description: "Full tracking & logs", included: true },
      { name: "Priority Support", description: "Faster human assistance", included: true },
      { name: "Exclusive Offers", description: "Discounts & member perks", included: false },
    ]
  },
  {
    id: "premium",
    name: "Premium",
    badge: "ALL-ACCESS",
    description: "More convenience for everyday drivers.",
    monthlyPrice: "149",
    billedYearly: "Billed ₹1,188 yearly",
    savings: "Save 25% (₹600)",
    isPopular: true,
    entitlements: [
      { name: "Vehicle Profile", description: "Unlimited vehicles", included: true },
      { name: "All Reminders", description: "Service, PUC, insurance & FASTag", included: true },
      { name: "Document Storage", description: "50 files", included: true },
      { name: "Service History & Analytics", description: "Full tracking & logs", included: true },
      { name: "Priority Support", description: "Faster human assistance", included: true },
      { name: "Exclusive Offers", description: "Discounts & member perks", included: true },
    ]
  }
];

export const membershipPlans: MembershipPlan[] = defaultMembershipPlans;

/**
 * Normalizes backend Super-Admin subscription plan records to frontend MembershipPlan shape.
 */
export function normalizeBackendPlan(plan: any): MembershipPlan {
  const priceNum = Number(plan.price) || 0;
  const isFree = priceNum === 0;

  const yearlyDiscountRate = 0.25;
  const yearlyTotal = isFree ? 0 : Math.round(priceNum * 12 * (1 - yearlyDiscountRate));
  const yearlySavings = isFree ? 0 : (priceNum * 12 - yearlyTotal);

  let entitlements: { name: string; description: string; included: boolean }[] = [];
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    entitlements = plan.features.map((f: any) => {
      if (typeof f === 'string') {
        return { name: f, description: '', included: true };
      }
      return {
        name: f.title || f.name || 'Feature',
        description: f.description || '',
        included: f.isIncluded !== false && f.included !== false,
      };
    });
  } else {
    // Fallback to match plan tier if custom features not specified
    const matchingDefault = defaultMembershipPlans.find(
      (p) => p.name.toLowerCase() === String(plan.name).toLowerCase()
    );
    entitlements = matchingDefault ? matchingDefault.entitlements : defaultMembershipPlans[0].entitlements;
  }

  const nameLower = String(plan.name).toLowerCase();
  const isPopular =
    plan.isPopular === true ||
    nameLower === 'premium' ||
    (plan.badge && String(plan.badge).toLowerCase().includes('popular'));

  return {
    id: plan.id || plan.slug || nameLower,
    name: plan.name || 'Plan',
    badge: plan.badge || (isPopular ? 'ALL-ACCESS' : undefined),
    description: plan.description || 'Access to smart vehicle safety and telemetry tools.',
    monthlyPrice: String(priceNum),
    billedYearly: isFree ? 'Free forever' : `Billed ₹${yearlyTotal.toLocaleString()} yearly`,
    savings: isFree ? 'No card required' : `Save 25% (₹${yearlySavings.toLocaleString()})`,
    isPopular: Boolean(isPopular),
    entitlements,
  };
}

/**
 * Fetches real active membership plans created by Super-Admin in backend.
 * Revalidates periodically via Next.js ISR.
 */
export async function getRealMembershipPlans(): Promise<MembershipPlan[]> {
  const candidateUrls = [
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:4000',
    'https://carqconnect-backend.onrender.com',
  ].filter(Boolean) as string[];

  for (const baseUrl of candidateUrls) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    try {
      const res = await fetch(`${cleanBase}/api/v1/memberships/plans`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const json = await res.json();
        const rawPlans = json.data || json;
        if (Array.isArray(rawPlans) && rawPlans.length > 0) {
          return rawPlans.map(normalizeBackendPlan);
        }
      }
    } catch (_) {
      // Continue to next endpoint candidate
    }
  }

  return defaultMembershipPlans;
}
