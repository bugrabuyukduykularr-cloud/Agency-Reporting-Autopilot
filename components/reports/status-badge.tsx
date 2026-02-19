import type { ReportStatus } from "@/types/index";

interface StatusBadgeProps {
  status: ReportStatus;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; bg: string; text: string }
> = {
  sent: {
    label: "Delivered",
    bg: "#F0FFF4",
    text: "#48BB78",
  },
  generating: {
    label: "Generating",
    bg: "#FFF4F0",
    text: "#FF6B35",
  },
  ready: {
    label: "Ready",
    bg: "#FFF4F0",
    text: "#FF6B35",
  },
  failed: {
    label: "Failed",
    bg: "#FFF5F5",
    text: "#F56565",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
}
