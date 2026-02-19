import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border p-5"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E8EBED" }}
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-14 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        className="rounded-lg border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E8EBED" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E8EBED" }}
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="px-6 py-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-10 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
