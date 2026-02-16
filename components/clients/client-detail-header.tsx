"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { getAvatarColor, getInitials } from "@/lib/utils";
import type { Client } from "@/types/database";

interface ClientDetailHeaderProps {
  client: Client;
}

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  const avatarColor = getAvatarColor(client.name);
  const initials = getInitials(client.name);

  return (
    <>
      {/* Breadcrumb */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Clients
      </Link>

      {/* Header Row */}
      <div className="flex items-center justify-between mt-2">
        {/* Left: Avatar + Name + Badge */}
        <div className="flex items-center gap-4">
          <div
            style={{ backgroundColor: avatarColor }}
            className="w-12 h-12 flex items-center justify-center rounded-full text-white text-base font-bold flex-shrink-0"
          >
            {initials}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {client.active ? (
              <Badge
                variant="outline"
                className="border-green-300 bg-green-50 text-green-700"
              >
                Active
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-slate-300 bg-slate-50 text-slate-500"
              >
                Inactive
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
          >
            Edit Client
          </Button>
          <Button
            className="bg-[#0F172A] hover:bg-[#1e293b] text-white"
            disabled
            title="Coming in Section 6"
          >
            <Play className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />
    </>
  );
}
