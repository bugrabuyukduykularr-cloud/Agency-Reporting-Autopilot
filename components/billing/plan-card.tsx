"use client";

import { Check } from "lucide-react";
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
        "relative flex flex-col rounded-lg border bg-white p-6 transition-shadow hover:shadow-sm",
        isPopular ? "border-[#FF6B35] ring-2 ring-[#FF6B35]/20" : "border-[#E8EBED]"
      )}
    >
      {badge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded px-3 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: "#FF6B35" }}
        >
          {badge}
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: "#2D3748" }}>
          {name}
        </h3>
        <p className="mt-1 text-sm" style={{ color: "#718096" }}>
          {description}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-bold"
            style={{ color: "#2D3748" }}
          >
            ${price}
          </span>
          <span className="text-sm" style={{ color: "#718096" }}>
            /month
          </span>
        </div>
        {interval === "annual" && (
          <div className="mt-1 flex items-center gap-2">
            <span
              className="text-sm line-through"
              style={{ color: "#CBD5E0" }}
            >
              ${monthlyPrice}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "#48BB78" }}
            >
              Save ${yearlySavings}/year
            </span>
          </div>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: "#48BB78" }}
            />
            <span style={{ color: "#2D3748" }}>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button
          disabled
          className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium opacity-60"
          style={{ borderColor: "#E8EBED", color: "#718096" }}
        >
          Current Plan
        </button>
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: isPopular ? "#FF6B35" : "#2D3748" }}
        >
          {loading ? "Redirecting..." : `Choose ${name}`}
        </button>
      )}
    </div>
  );
}
