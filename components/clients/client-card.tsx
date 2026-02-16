"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getAvatarColor, getInitials } from "@/lib/utils";
import type { Client } from "@/types/database";

interface ClientCardProps {
  client: Client;
  reportCount: number;
}

function scheduleLabel(schedule: string): string {
  switch (schedule) {
    case "monthly":
      return "Monthly reports";
    case "weekly":
      return "Weekly reports";
    case "on_demand":
      return "On demand";
    default:
      return schedule;
  }
}

export function ClientCard({ client, reportCount }: ClientCardProps) {
  const router = useRouter();
  const avatarColor = getAvatarColor(client.name);
  const initials = getInitials(client.name);

  function handleClick() {
    router.push(`/clients/${client.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={[
        "bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "p-5",
        client.active === false ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* TOP ROW */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            style={{ backgroundColor: avatarColor }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white text-sm font-bold flex-shrink-0"
          >
            {initials}
          </div>
          {/* Name + Schedule */}
          <div>
            <p className="text-sm font-semibold text-slate-800">{client.name}</p>
            <p className="text-xs text-slate-400 capitalize">
              {scheduleLabel(client.report_schedule)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {client.active ? (
          <Badge
            variant="outline"
            className="border-green-300 bg-green-50 text-green-700"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-slate-300 bg-slate-50 text-slate-500"
          >
            Inactive
          </Badge>
        )}
      </div>

      {/* MIDDLE ROW — platform tags placeholder */}
      <div className="mt-4">
        <p className="text-xs text-slate-400 italic">No platforms connected</p>
      </div>

      {/* BOTTOM ROW */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          {reportCount} report{reportCount !== 1 ? "s" : ""}
        </span>
        <span>
          {client.report_schedule === "on_demand"
            ? "On demand"
            : client.next_report_at
            ? `Next: ${format(parseISO(client.next_report_at), "MMM d")}`
            : "Not scheduled"}
        </span>
      </div>
    </div>
  );
}
