import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import type { TeamMember } from "@/types/database";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const agency = await getAgency(supabase);
  if (!agency) redirect("/login");

  // Get team members
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("agency_id", agency.id)
    .order("joined_at", { ascending: true });

  const teamMembers = (members ?? []) as TeamMember[];

  // Attach user info where available
  const memberDetails: Array<
    TeamMember & { email: string; full_name: string }
  > = teamMembers.map((tm) => {
    if (tm.user_id === user.id) {
      return {
        ...tm,
        email: user.email ?? "",
        full_name:
          (user.user_metadata?.full_name as string) ??
          user.email?.split("@")[0] ??
          "User",
      };
    }
    return { ...tm, email: "", full_name: "Team Member" };
  });

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <SettingsTabs
        agency={agency}
        teamMembers={memberDetails}
        currentUserId={user.id}
      />
    </div>
  );
}
