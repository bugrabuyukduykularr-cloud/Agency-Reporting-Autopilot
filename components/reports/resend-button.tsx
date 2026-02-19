"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResendButtonProps {
  reportId: string;
}

export function ResendButton({ reportId }: ResendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(`/api/reports/${reportId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = (await resp.json()) as {
        success: boolean;
        sentCount?: number;
        error?: string;
      };

      if (json.success) {
        setResult(`Sent to ${json.sentCount} recipient(s)`);
      } else {
        setResult(json.error ?? "Failed to send");
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleResend} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Resend Email
      </Button>
      {result && (
        <span className="text-xs text-slate-500">{result}</span>
      )}
    </div>
  );
}
