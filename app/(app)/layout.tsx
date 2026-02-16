import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
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
  const userAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar
        agency={agency}
        userName={fullName}
        userEmail={userEmail}
        userAvatar={userAvatar}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header (hamburger + drawer) */}
        <MobileHeader
          agency={agency}
          userName={fullName}
          userAvatar={userAvatar}
        />

        {/* Trial warning banner */}
        {agency?.plan === "trial" && agency.trial_ends_at && (
          <TrialBanner
            trialEndsAt={agency.trial_ends_at}
            plan={agency.plan}
          />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
