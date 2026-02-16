"use client";

import { useState } from "react";
import { ClientCard } from "@/components/clients/client-card";
import { AddClientCard } from "@/components/clients/add-client-card";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import type { ClientWithStats } from "@/types/database";

interface ClientGridProps {
  clients: ClientWithStats[];
  agencyId: string;
}

export function ClientGrid({ clients, agencyId }: ClientGridProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            reportCount={client.report_count}
          />
        ))}
        <AddClientCard onClick={() => setIsDialogOpen(true)} />
      </div>

      <AddClientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        agencyId={agencyId}
      />
    </>
  );
}
