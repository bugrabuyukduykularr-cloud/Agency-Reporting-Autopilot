"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl">!</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          An unexpected error occurred. Please try again or go back to the
          dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
