import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <div
      className="rounded-lg border p-5 transition-shadow hover:shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "#E8EBED",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: "#718096" }}
          >
            {title}
          </p>
          <p
            className="mt-1.5 text-[28px] font-bold tracking-tight"
            style={{ color: "#2D3748" }}
          >
            {value}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "#718096" }}>
            {subtitle}
          </p>
        </div>
        <Icon className="h-5 w-5 shrink-0" style={{ color: "#CBD5E0" }} />
      </div>
    </div>
  );
}
