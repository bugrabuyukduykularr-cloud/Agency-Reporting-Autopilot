"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface PublicReportClientProps {
  reportId: string;
  token: string;
  status: string;
  pdfUrl: string | null;
  clientName: string;
  agencyName: string;
  primaryColor: string;
  logoUrl: string | null;
  periodLabel: string;
}

export function PublicReportClient({
  token,
  status: initialStatus,
  pdfUrl: initialPdfUrl,
  clientName,
  agencyName,
  primaryColor,
  logoUrl,
  periodLabel,
}: PublicReportClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl);

  // Fire tracking pixel on mount
  useEffect(() => {
    const img = new Image();
    img.src = `/api/track/open?r=${token}&e=public`;
  }, [token]);

  // Auto-refresh if still generating
  useEffect(() => {
    if (status !== "generating") return;

    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/reports/public-status?token=${token}`);
        const json = (await resp.json()) as {
          status: string;
          pdf_url: string | null;
        };
        if (json.status !== "generating") {
          setStatus(json.status);
          setPdfUrl(json.pdf_url);
          clearInterval(interval);
        }
      } catch {
        // Retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, token]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={agencyName}
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-sm">
              {agencyName}
            </span>
          )}
          {logoUrl && (
            <span className="text-white/90 text-sm font-medium">
              {agencyName}
            </span>
          )}
        </div>

        {pdfUrl && (
          <a
            href={`/r/${token}/download`}
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-[900px] mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{clientName}</h1>
          <p className="text-slate-500 mt-1">{periodLabel}</p>
          <p className="text-sm text-slate-400 mt-0.5">
            Your Marketing Performance Report
          </p>
        </div>

        {(status === "ready" || status === "sent") && pdfUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <iframe
              src={pdfUrl}
              title="Report PDF"
              className="w-full border-0"
              style={{ height: "1000px" }}
            />
          </div>
        ) : status === "generating" ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700">
              Generating Your Report
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              This usually takes a minute or two. The page will refresh
              automatically.
            </p>
          </div>
        ) : status === "failed" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center">
            <h2 className="text-lg font-semibold text-red-800">
              Report Generation Issue
            </h2>
            <p className="text-sm text-red-600 mt-2">
              There was an issue generating your report. Please contact{" "}
              <strong>{agencyName}</strong> for assistance.
            </p>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-slate-400">
          Delivered by {agencyName}
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Powered by Agency Reporting Autopilot
        </p>
      </footer>
    </div>
  );
}
