"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  clientId: string;
  clientName: string;
  variant?: "default" | "outline";
}

type ReportStatus = "generating" | "ready" | "sent" | "failed";

interface GenerateResponse {
  success: boolean;
  reportId?: string;
  pdfUrl?: string;
  error?: string;
  executiveSummaryHeadline?: string;
}

interface StatusResponse {
  id: string;
  status: ReportStatus;
  pdfUrl: string | null;
}

export function GenerateButton({
  clientId,
  clientName,
  variant = "default",
}: GenerateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleGenerate() {
    setIsLoading(true);
    setPhase("Fetching data…");

    let reportId: string | null = null;

    try {
      const resp = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const json = (await resp.json()) as GenerateResponse;

      if (!resp.ok || !json.success) {
        throw new Error(json.error ?? "Generation failed");
      }

      reportId = json.reportId ?? null;
      setPhase("Generating PDF…");

      // If already ready (fast path), navigate immediately
      if (json.pdfUrl && reportId) {
        setIsLoading(false);
        setPhase("");
        router.push(`/reports/${reportId}`);
        router.refresh();
        return;
      }

      // Poll for completion
      if (reportId) {
        pollRef.current = setInterval(async () => {
          try {
            const statusResp = await fetch(`/api/reports/${reportId}`);
            if (!statusResp.ok) return;
            const status = (await statusResp.json()) as StatusResponse;

            if (status.status === "ready" || status.status === "sent") {
              stopPolling();
              setIsLoading(false);
              setPhase("");
              router.push(`/reports/${reportId}`);
              router.refresh();
            } else if (status.status === "failed") {
              stopPolling();
              setIsLoading(false);
              setPhase("");
              alert(`Report generation failed for ${clientName}. Please try again.`);
            }
          } catch {
            // Network hiccup — keep polling
          }
        }, 3000);
      }
    } catch (err) {
      stopPolling();
      setIsLoading(false);
      setPhase("");
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Error generating report for ${clientName}: ${msg}`);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={isLoading}
      variant={variant}
      className={
        variant === "default"
          ? "bg-[#0F172A] hover:bg-[#1e293b] text-white"
          : undefined
      }
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {phase || "Generating…"}
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Generate Report
        </>
      )}
    </Button>
  );
}
