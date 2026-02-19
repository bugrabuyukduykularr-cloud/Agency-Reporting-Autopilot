import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-slate-200 mb-4">404</div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
