import { createClient } from "@/lib/supabase/server";
import {
  getAgency,
  getAllClients,
  getReportCountsByClient,
} from "@/lib/supabase/queries";
import { ClientGrid } from "@/components/clients/client-grid";
import { AddClientButton } from "@/components/clients/add-client-button";
import { Users } from "lucide-react";
import type { ClientWithStats } from "@/types/database";

export default async function ClientsPage() {
  const supabase = createClient();
  const agency = await getAgency(supabase);

  const [clients, reportCounts] = await Promise.all([
    agency ? getAllClients(supabase, agency.id) : Promise.resolve([]),
    agency
      ? getReportCountsByClient(supabase, agency.id)
      : Promise.resolve({} as Record<string, number>),
  ]);

  const clientsWithStats: ClientWithStats[] = clients.map((c) => ({
    ...c,
    report_count: reportCounts[c.id] ?? 0,
  }));

  const agencyId = agency?.id ?? "";

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1
            className="text-[28px] font-bold"
            style={{ color: "#2D3748" }}
          >
            Clients
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: "#718096" }}>
            Manage your client accounts
          </p>
        </div>
        <AddClientButton agencyId={agencyId} />
      </div>

      {/* Content */}
      {clientsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="h-16 w-16 mb-4" style={{ color: "#E8EBED" }} />
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#2D3748" }}
          >
            No clients yet
          </h2>
          <p className="mb-6 max-w-sm text-sm" style={{ color: "#718096" }}>
            Add your first client to start generating automated reports.
          </p>
          <AddClientButton agencyId={agencyId} label="Add Your First Client" />
        </div>
      ) : (
        <ClientGrid clients={clientsWithStats} agencyId={agencyId} />
      )}
    </div>
  );
}
