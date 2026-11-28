import { prisma } from '../../config/database';

export interface PlanLimits {
  plan: string;
  maxVehicles: number;
  maxDocuments: number;
}

export function getLimitsForPlan(planName?: string | null): PlanLimits {
  const plan = (planName || 'Free').toLowerCase().trim();

  if (plan.includes('prem') || plan.includes('pro') || plan.includes('gold')) {
    return {
      plan: 'Premium',
      maxVehicles: 5,
      maxDocuments: 50,
    };
  } else if (plan.includes('basic') || plan.includes('silver') || plan.includes('standard')) {
    return {
      plan: 'Basic',
      maxVehicles: 3,
      maxDocuments: 20,
    };
  }

  return {
    plan: 'Free',
    maxVehicles: 1,
    maxDocuments: 5,
  };
}

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  return getLimitsForPlan(sub?.plan?.name);
}
