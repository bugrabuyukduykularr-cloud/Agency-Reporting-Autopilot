"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Account {
  id: string;
  name: string;
  displayName?: string;
}

interface AccountSelectorProps {
  clientId: string;
  clientName: string;
  platform: string;
  platformLabel: string;
  pendingRef: string;
  accounts: Account[];
  completeUrl: string;
}

export function AccountSelector({
  clientId,
  clientName,
  platform,
  platformLabel,
  pendingRef,
  accounts,
  completeUrl,
}: AccountSelectorProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  async function handleConnect() {
    if (!selectedId || !selectedAccount) return;
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(completeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingRef,
          propertyId: selectedId,
          propertyName: selectedAccount.displayName ?? selectedAccount.name,
          clientId,
        }),
      });

      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(
        `/clients/${clientId}/connections?success=true&platform=${platform}`
      );
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">
            Select your {platformLabel} account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose which account to connect to{" "}
            <span className="font-medium text-slate-700">{clientName}</span>
          </p>

          <div className="mt-6 space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedId(account.id)}
                className={[
                  "w-full text-left rounded-lg border p-4 transition-all",
                  selectedId === account.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-[#E2E8F0] hover:border-slate-300 bg-white",
                ].join(" ")}
              >
                <p className="font-medium text-slate-800">
                  {account.displayName ?? account.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{account.id}</p>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="mt-6">
            <Button
              className="w-full"
              disabled={!selectedId || loading}
              onClick={handleConnect}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Connecting..." : "Connect Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
