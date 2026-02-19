"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface TrialBannerProps {
  trialEndsAt: string;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const key = `trial-banner-dismissed-${trialEndsAt.split("T")[0]}`;
    if (localStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [trialEndsAt]);

  if (!mounted || dismissed || plan !== "trial") return null;

  const daysLeft = differenceInDays(parseISO(trialEndsAt), new Date());
  if (daysLeft < 0) return null;

  const isUrgent = daysLeft <= 3;

  function handleDismiss() {
    const key = `trial-banner-dismissed-${trialEndsAt.split("T")[0]}`;
    localStorage.setItem(key, "1");
    setDismissed(true);
  }

  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-2.5 text-sm ${
        isUrgent
          ? "bg-red-50 text-red-800 border-red-200"
          : "bg-amber-50 text-amber-800 border-amber-200"
      }`}
    >
      <p>
        Your free trial ends in{" "}
        <strong>
          {daysLeft} day{daysLeft !== 1 ? "s" : ""}
        </strong>
        . Upgrade to keep access.
      </p>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <Link
          href="/upgrade"
          className="rounded-md px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: "#FF6B35" }}
        >
          Upgrade now
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss trial banner"
          className="text-current opacity-60 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
