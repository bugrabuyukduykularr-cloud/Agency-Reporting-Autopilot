"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: readonly string[];
  interval: "monthly" | "annual";
  isCurrent: boolean;
  isPopular?: boolean;
  badge?: string;
  onSelect: () => void;
  loading?: boolean;
}

export function PlanCard({
  name,
  description,
  monthlyPrice,
  annualPrice,
  features,
  interval,
  isCurrent,
  isPopular,
  badge,
  onSelect,
  loading,
}: PlanCardProps) {
  const price = interval === "annual" ? annualPrice : monthlyPrice;
  const yearlySavings = (monthlyPrice - annualPrice) * 12;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        isPopular
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-slate-200"
      )}
    >
      {badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white hover:bg-blue-600">
          {badge}
        </Badge>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">${price}</span>
          <span className="text-sm text-slate-500">/month</span>
        </div>
        {interval === "annual" && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-slate-400 line-through">
              ${monthlyPrice}
            </span>
            <span className="text-xs font-medium text-green-600">
              Save ${yearlySavings}/year
            </span>
          </div>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span className="text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <Button variant="outline" disabled className="w-full">
          Current Plan
        </Button>
      ) : (
        <Button
          onClick={onSelect}
          disabled={loading}
          className={cn(
            "w-full",
            isPopular
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-[#0F172A] hover:bg-[#1e293b] text-white"
          )}
        >
          {loading ? "Redirecting..." : `Choose ${name}`}
        </Button>
      )}
    </div>
  );
}
