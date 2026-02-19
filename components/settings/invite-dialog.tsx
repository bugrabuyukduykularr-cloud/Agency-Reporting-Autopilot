"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { checkPlanLimits } from "@/lib/stripe/plans";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  agencyPlan: string;
  currentMemberCount: number;
}

export function InviteDialog({
  open,
  onOpenChange,
  agencyPlan,
  currentMemberCount,
}: InviteDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [sending, setSending] = useState(false);

  const { canAddTeamMember } = checkPlanLimits(
    agencyPlan,
    0,
    currentMemberCount
  );

  async function handleInvite() {
    if (!email.trim()) return;

    if (!canAddTeamMember) {
      toast({
        title: "Plan limit reached",
        description:
          "Upgrade your plan to add more team members.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const resp = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = (await resp.json()) as {
        success: boolean;
        error?: string;
      };

      if (!json.success) throw new Error(json.error ?? "Invite failed");

      toast({ title: `Invitation sent to ${email}` });
      setEmail("");
      setRole("viewer");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Invite failed",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {!canAddTeamMember ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You&apos;ve reached the team member limit for your current plan.
            </p>
            <Button asChild className="w-full">
              <a href="/upgrade">Upgrade Plan</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                <Button
                  variant={role === "admin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("admin")}
                >
                  Admin
                </Button>
                <Button
                  variant={role === "viewer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("viewer")}
                >
                  Viewer
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                {role === "admin"
                  ? "Admins can manage clients, reports, and team members."
                  : "Viewers can only view reports and dashboards."}
              </p>
            </div>

            <Button
              onClick={handleInvite}
              disabled={sending || !email.trim()}
              className="w-full"
            >
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
