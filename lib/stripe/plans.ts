export const PLANS = {
  starter: {
    id: "starter" as const,
    name: "Starter",
    description: "Perfect for freelancers and solo consultants",
    monthlyPrice: 79,
    annualPrice: 66,
    stripePriceMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
    stripePriceAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? "",
    features: [
      "Up to 5 clients",
      "2 team members",
      "All platform integrations",
      "AI-powered insights",
      "Automated delivery",
      "Email support",
    ],
    limits: {
      maxClients: 5 as number | null,
      maxTeamMembers: 2 as number | null,
    },
  },
  agency: {
    id: "agency" as const,
    name: "Agency",
    description: "Most popular for growing agencies",
    monthlyPrice: 149,
    annualPrice: 124,
    stripePriceMonthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY ?? "",
    stripePriceAnnual: process.env.STRIPE_PRICE_AGENCY_ANNUAL ?? "",
    features: [
      "Unlimited clients",
      "5 team members",
      "All platform integrations",
      "Custom domain",
      "Priority support",
      "Advanced analytics",
    ],
    limits: {
      maxClients: null as number | null,
      maxTeamMembers: 5 as number | null,
    },
    badge: "Most Popular",
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "For established agencies with multiple teams",
    monthlyPrice: 299,
    annualPrice: 249,
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    stripePriceAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
    features: [
      "Unlimited clients",
      "Unlimited team members",
      "All platform integrations",
      "Custom domain",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    limits: {
      maxClients: null as number | null,
      maxTeamMembers: null as number | null,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanById(planId: string) {
  return (PLANS as Record<string, (typeof PLANS)[PlanId]>)[planId] ?? null;
}

export function checkPlanLimits(
  planId: string,
  currentClients: number,
  currentTeamMembers: number
): { canAddClient: boolean; canAddTeamMember: boolean } {
  const plan = getPlanById(planId);
  if (!plan) return { canAddClient: false, canAddTeamMember: false };

  return {
    canAddClient:
      plan.limits.maxClients === null ||
      currentClients < plan.limits.maxClients,
    canAddTeamMember:
      plan.limits.maxTeamMembers === null ||
      currentTeamMembers < plan.limits.maxTeamMembers,
  };
}
