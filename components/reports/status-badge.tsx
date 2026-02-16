import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/types/index";

interface StatusBadgeProps {
  status: ReportStatus;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  sent: {
    label: "Sent",
    className:
      "border-green-300 bg-green-50 text-green-700 hover:bg-green-50",
  },
  generating: {
    label: "Generating",
    className: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50",
  },
  ready: {
    label: "Ready",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50",
  },
  failed: {
    label: "Failed",
    className: "border-red-300 bg-red-50 text-red-700 hover:bg-red-50",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
