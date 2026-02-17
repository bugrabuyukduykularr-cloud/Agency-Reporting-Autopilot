import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAgency,
  getClientById,
  getClientConnections,
  getClientSections,
  getClientReports,
} from "@/lib/supabase/queries";
import { ClientDetailHeader } from "@/components/clients/client-detail-header";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [agency, client] = await Promise.all([
    getAgency(supabase),
    getClientById(supabase, params.id),
  ]);

  if (!client || !agency || client.agency_id !== agency.id) {
    redirect("/clients");
  }

  const [connections, sections, recentReports] = await Promise.all([
    getClientConnections(supabase, client.id),
    getClientSections(supabase, client.id),
    getClientReports(supabase, client.id, 5),
  ]);

  return (
    <div className="p-6 max-w-5xl">
      <ClientDetailHeader client={client} />
      <div className="mt-8">
        <ClientDetailTabs
          client={client}
          connections={connections}
          sections={sections}
          recentReports={recentReports}
          agencyId={agency.id}
        />
      </div>
    </div>
  );
}
