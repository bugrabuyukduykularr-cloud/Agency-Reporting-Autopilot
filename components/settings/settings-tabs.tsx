"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./profile-tab";
import { WhiteLabelTab } from "./white-label-tab";
import { BillingTab } from "./billing-tab";
import { TeamTab } from "./team-tab";
import type { Agency, TeamMember } from "@/types/database";

interface SettingsTabsProps {
  agency: Agency;
  teamMembers: Array<TeamMember & { email: string; full_name: string }>;
  currentUserId: string;
}

export function SettingsTabs({
  agency,
  teamMembers,
  currentUserId,
}: SettingsTabsProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "profile";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="white-label">White-Label</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab agency={agency} />
      </TabsContent>

      <TabsContent value="white-label">
        <WhiteLabelTab agency={agency} />
      </TabsContent>

      <TabsContent value="billing">
        <BillingTab agency={agency} />
      </TabsContent>

      <TabsContent value="team">
        <TeamTab
          agency={agency}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
        />
      </TabsContent>
    </Tabs>
  );
}
