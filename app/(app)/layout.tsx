import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { TopNav } from "@/components/layout/top-nav";
import { TrialBanner } from "@/components/layout/trial-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const agency = user ? await getAgency(supabase) : null;

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "User";
  const userEmail = user?.email ?? "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFBFC" }}>
      <TopNav agency={agency} userName={fullName} userEmail={userEmail} />

      {agency?.plan === "trial" && agency.trial_ends_at && (
        <TrialBanner trialEndsAt={agency.trial_ends_at} plan={agency.plan} />
      )}

      <main>{children}</main>
    </div>
  );
}
