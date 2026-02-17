import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClientById, getAgency } from "@/lib/supabase/queries";
import { AccountSelector } from "@/components/clients/account-selector";

interface PendingRecord {
  id: string;
  client_id: string;
  agency_id: string;
  platform: string;
  properties: Array<{ id: string; name: string; displayName?: string }>;
}

interface PageProps {
  params: { id: string };
  searchParams: {
    platform?: string;
    pending?: string;
    step?: string;
    success?: string;
    error?: string;
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  google_analytics: "Google Analytics 4",
  meta_ads: "Meta Ads",
  linkedin_ads: "LinkedIn Ads",
};

const COMPLETE_URLS: Record<string, string> = {
  google_analytics: "/api/oauth/google/complete",
  meta_ads: "/api/oauth/meta/complete",
  linkedin_ads: "/api/oauth/linkedin/complete",
};

export default async function ConnectionsPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = createClient();
  const [agency, client] = await Promise.all([
    getAgency(supabase),
    getClientById(supabase, params.id),
  ]);

  if (!client || !agency || client.agency_id !== agency.id) {
    redirect("/clients");
  }

  // ── Account selection step ────────────────────────────────────────────────
  if (
    searchParams.step === "select-account" &&
    searchParams.pending &&
    searchParams.platform
  ) {
    const { data: pendingRaw } = await supabase
      .from("oauth_pending")
      .select("id, client_id, agency_id, platform, properties")
      .eq("id", searchParams.pending)
      .eq("client_id", params.id)
      .single();

    const pending = pendingRaw as PendingRecord | null;

    if (!pending) {
      redirect(
        `/clients/${params.id}/connections?error=Invalid+or+expired+connection+session.+Please+try+again.`
      );
    }

    const platformLabel =
      PLATFORM_LABELS[searchParams.platform] ?? searchParams.platform;
    const completeUrl =
      COMPLETE_URLS[searchParams.platform] ??
      `/api/oauth/${searchParams.platform}/complete`;

    return (
      <AccountSelector
        clientId={client.id}
        clientName={client.name}
        platform={searchParams.platform}
        platformLabel={platformLabel}
        pendingRef={pending.id}
        accounts={pending.properties}
        completeUrl={completeUrl}
      />
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (searchParams.success === "true") {
    const platformLabel = searchParams.platform
      ? (PLATFORM_LABELS[searchParams.platform] ?? searchParams.platform)
      : "Platform";

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 shadow-sm">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {platformLabel} connected!
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your account has been successfully connected to{" "}
              <span className="font-medium text-slate-700">{client.name}</span>.
            </p>
            <div className="mt-8">
              <Link
                href={`/clients/${params.id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Back to Client
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (searchParams.error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 shadow-sm">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Connection Failed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {decodeURIComponent(searchParams.error)}
            </p>
            <div className="mt-8 flex flex-col gap-3 items-center">
              <Link
                href={`/clients/${params.id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/clients"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Back to Clients
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  redirect(`/clients/${params.id}`);
}
