"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Agency } from "@/types/database";

interface Invoice {
  id: string;
  date: number;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
}

interface BillingTabProps {
  agency: Agency;
}

export function BillingTab({ agency }: BillingTabProps) {
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const resp = await fetch("/api/stripe/invoices");
        const json = (await resp.json()) as { invoices?: Invoice[] };
        setInvoices(json.invoices ?? []);
      } catch {
        // Non-fatal
      } finally {
        setLoadingInvoices(false);
      }
    }
    fetchInvoices();
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const resp = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      });
      const json = (await resp.json()) as { url?: string; error?: string };

      if (json.url) {
        window.location.href = json.url;
      } else {
        toast({
          title: "Error",
          description: json.error ?? "Could not open billing portal",
          variant: "destructive",
        });
        setPortalLoading(false);
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
      setPortalLoading(false);
    }
  }

  const planLabel =
    agency.plan === "trial"
      ? "Trial"
      : agency.plan === "active"
        ? "Active"
        : "Cancelled";

  const planBadgeClass =
    agency.plan === "trial"
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : agency.plan === "active"
        ? "border-green-300 bg-green-50 text-green-700"
        : "border-red-300 bg-red-50 text-red-700";

  const trialDaysLeft = agency.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(agency.trial_ends_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="space-y-8">
      {/* Current plan */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>

        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {planLabel}
          </span>
          <Badge variant="outline" className={planBadgeClass}>
            {planLabel}
          </Badge>
        </div>

        {agency.plan === "trial" && trialDaysLeft !== null && (
          <p className="text-sm text-amber-700">
            {trialDaysLeft > 0
              ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} remaining in trial`
              : "Trial has expired"}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {agency.stripe_customer_id && (
            <Button
              variant="outline"
              onClick={openPortal}
              disabled={portalLoading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {portalLoading ? "Opening..." : "Manage Billing"}
            </Button>
          )}
          <Button asChild className="bg-[#0F172A] hover:bg-[#1e293b] text-white">
            <a href="/upgrade">Upgrade Plan</a>
          </Button>
        </div>
      </div>

      {/* Billing history */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Billing History
        </h2>

        {loadingInvoices ? (
          <p className="text-sm text-slate-500">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 font-medium text-slate-500">Date</th>
                  <th className="pb-2 font-medium text-slate-500">Amount</th>
                  <th className="pb-2 font-medium text-slate-500">Status</th>
                  <th className="pb-2 font-medium text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 text-slate-700">
                      {new Date(inv.date * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-700">
                      ${inv.amount.toFixed(2)}{" "}
                      {inv.currency.toUpperCase()}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          inv.status === "paid"
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-slate-300 bg-slate-50 text-slate-700"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {inv.pdfUrl && (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
