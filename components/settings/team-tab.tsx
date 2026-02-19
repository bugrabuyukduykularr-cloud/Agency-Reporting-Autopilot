"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InviteDialog } from "./invite-dialog";
import type { Agency, TeamMember } from "@/types/database";

interface TeamTabProps {
  agency: Agency;
  teamMembers: Array<TeamMember & { email: string; full_name: string }>;
  currentUserId: string;
}

const roleBadgeClass: Record<string, string> = {
  owner: "border-purple-300 bg-purple-50 text-purple-700",
  admin: "border-blue-300 bg-blue-50 text-blue-700",
  viewer: "border-slate-300 bg-slate-50 text-slate-700",
};

export function TeamTab({
  agency,
  teamMembers,
  currentUserId,
}: TeamTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const currentMember = teamMembers.find((m) => m.user_id === currentUserId);
  const canManage =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    setRemoving(memberId);
    try {
      const resp = await fetch("/api/team/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMemberId: memberId }),
      });
      const json = (await resp.json()) as {
        success: boolean;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Remove failed");
      toast({ title: "Team member removed" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Remove failed",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Team Members
          </h2>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>

        {teamMembers.length === 0 ? (
          <p className="text-sm text-slate-500">
            No team members yet. Invite someone to get started.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {member.full_name}
                      {member.user_id === currentUserId && (
                        <span className="ml-1 text-xs text-slate-400">
                          (you)
                        </span>
                      )}
                    </p>
                    {member.email && (
                      <p className="text-xs text-slate-500">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={roleBadgeClass[member.role] ?? ""}
                  >
                    {member.role}
                  </Badge>
                  {canManage &&
                    member.role !== "owner" &&
                    member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        disabled={removing === member.id}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        agencyId={agency.id}
        agencyPlan={agency.plan}
        currentMemberCount={teamMembers.length}
      />
    </div>
  );
}
