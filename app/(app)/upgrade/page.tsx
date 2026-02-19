"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import { PlanCard } from "@/components/billing/plan-card";
import { cn } from "@/lib/utils";

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSelect(planId: PlanId) {
    setLoadingPlan(planId);

    try {
      const resp = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });

      const json = (await resp.json()) as {
        url?: string;
        error?: string;
      };

      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error ?? "Failed to start checkout");
        setLoadingPlan(null);
      }
    } catch {
      alert("Network error");
      setLoadingPlan(null);
    }
  }

  const planEntries = Object.entries(PLANS) as [
    PlanId,
    (typeof PLANS)[PlanId],
  ][];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {canceled && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Checkout was canceled. Choose a plan whenever you&apos;re ready.
        </div>
      )}

      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Choose Your Plan
        </h1>
        <p className="mt-2 text-slate-500">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              interval === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              interval === "annual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Annual
            <span className="ml-1.5 text-xs text-green-600 font-semibold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planEntries.map(([id, plan]) => (
          <PlanCard
            key={id}
            name={plan.name}
            description={plan.description}
            monthlyPrice={plan.monthlyPrice}
            annualPrice={plan.annualPrice}
            features={plan.features}
            interval={interval}
            isCurrent={false}
            isPopular={"badge" in plan}
            badge={"badge" in plan ? (plan as { badge: string }).badge : undefined}
            onSelect={() => handleSelect(id)}
            loading={loadingPlan === id}
          />
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-slate-400">
        All plans include a 14-day free trial. Cancel anytime.
        Prices shown in USD.
      </p>
    </div>
  );
}
