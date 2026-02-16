import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: "blue" | "green" | "amber" | "purple";
  trend?: { value: number; label: string };
}

const iconColorMap: Record<
  StatCardProps["iconColor"],
  { bg: string; text: string }
> = {
  blue:   { bg: "bg-blue-100",   text: "text-blue-600" },
  green:  { bg: "bg-green-100",  text: "text-green-600" },
  amber:  { bg: "bg-amber-100",  text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
}: StatCardProps) {
  const colors = iconColorMap[iconColor];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            colors.bg
          )}
        >
          <Icon className={cn("h-5 w-5", colors.text)} />
        </div>
      </div>
    </div>
  );
}
