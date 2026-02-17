"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Client, DataConnection } from "@/types/database";
import type { Platform } from "@/types/index";

interface ConnectionsTabProps {
  client: Client;
  connections: DataConnection[];
  agencyId: string;
}

const PLATFORM_CONFIG = {
  google_analytics: {
    label: "Google Analytics 4",
    description:
      "Connect your GA4 property to import traffic and conversion data.",
    authorizeUrl: (clientId: string, agencyId: string) =>
      `/api/oauth/google/authorize?clientId=${clientId}&agencyId=${agencyId}`,
    color: "bg-orange-100 text-orange-600",
    abbrev: "GA4",
  },
  meta_ads: {
    label: "Meta Ads",
    description:
      "Connect your Meta ad account to import campaign performance data.",
    authorizeUrl: (clientId: string, agencyId: string) =>
      `/api/oauth/meta/authorize?clientId=${clientId}&agencyId=${agencyId}`,
    color: "bg-blue-100 text-blue-600",
    abbrev: "META",
  },
  linkedin_ads: {
    label: "LinkedIn Ads",
    description:
      "Connect your LinkedIn ad account to import B2B campaign data.",
    authorizeUrl: (clientId: string, agencyId: string) =>
      `/api/oauth/linkedin/authorize?clientId=${clientId}&agencyId=${agencyId}`,
    color: "bg-sky-100 text-sky-600",
    abbrev: "LI",
  },
} as const;

type PlatformKey = keyof typeof PLATFORM_CONFIG;
const PLATFORM_ORDER: PlatformKey[] = [
  "google_analytics",
  "meta_ads",
  "linkedin_ads",
];

function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return "Never synced";
  return formatDistanceToNow(parseISO(lastSyncedAt), { addSuffix: true });
}

export function ConnectionsTab({
  client,
  connections,
  agencyId,
}: ConnectionsTabProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [targetConnection, setTargetConnection] =
    useState<DataConnection | null>(null);

  function openDisconnectDialog(connection: DataConnection) {
    setTargetConnection(connection);
    setDisconnectOpen(true);
  }

  async function handleDisconnect() {
    if (!targetConnection) return;
    setDisconnecting(targetConnection.id);
    try {
      const resp = await fetch("/api/connections/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: targetConnection.id,
          clientId: client.id,
        }),
      });
      if (resp.ok) {
        router.refresh();
      }
    } finally {
      setDisconnecting(null);
      setDisconnectOpen(false);
      setTargetConnection(null);
    }
  }

  return (
    <div className="space-y-3">
      {PLATFORM_ORDER.map((platformKey) => {
        const config = PLATFORM_CONFIG[platformKey];
        const connection = connections.find(
          (c) => c.platform === (platformKey as Platform)
        );

        // ── DISCONNECTED ────────────────────────────────────────────────────
        if (!connection) {
          return (
            <div
              key={platformKey}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${config.color}`}
                >
                  {config.abbrev}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{config.label}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{config.description}</p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(config.authorizeUrl(client.id, agencyId))
                  }
                >
                  Connect
                </Button>
              </div>
            </div>
          );
        }

        // ── CONNECTED ───────────────────────────────────────────────────────
        if (connection.status === "connected") {
          return (
            <div
              key={platformKey}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${config.color}`}
                >
                  {config.abbrev}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">
                      {config.label}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-green-300 bg-green-50 text-green-700 ml-auto"
                    >
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-0.5">
                    {connection.account_name}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Last synced: {formatLastSynced(connection.last_synced_at)}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(config.authorizeUrl(client.id, agencyId))
                  }
                >
                  Reconnect
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={disconnecting === connection.id}
                  onClick={() => openDisconnectDialog(connection)}
                >
                  {disconnecting === connection.id
                    ? "Disconnecting..."
                    : "Disconnect"}
                </Button>
              </div>
            </div>
          );
        }

        // ── ERROR ───────────────────────────────────────────────────────────
        if (connection.status === "error") {
          return (
            <div
              key={platformKey}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${config.color}`}
                >
                  {config.abbrev}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">
                      {config.label}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-red-50 text-red-700 ml-auto"
                    >
                      Connection Error
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-red-500">
                {connection.error_message ?? "Unknown error"}
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(config.authorizeUrl(client.id, agencyId))
                  }
                >
                  Reconnect
                </Button>
              </div>
            </div>
          );
        }

        // ── EXPIRED ─────────────────────────────────────────────────────────
        return (
          <div
            key={platformKey}
            className="bg-white rounded-xl border border-[#E2E8F0] p-5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${config.color}`}
              >
                {config.abbrev}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{config.label}</p>
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-amber-700 ml-auto"
                  >
                    Token Expired
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Your access has expired. Please reconnect.
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() =>
                  router.push(config.authorizeUrl(client.id, agencyId))
                }
              >
                Reconnect
              </Button>
            </div>
          </div>
        );
      })}

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Platform</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{" "}
              <strong>
                {targetConnection
                  ? PLATFORM_CONFIG[
                      targetConnection.platform as PlatformKey
                    ]?.label
                  : "this platform"}
              </strong>
              ? This will remove all associated connection data. You can
              reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setTargetConnection(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDisconnect}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
