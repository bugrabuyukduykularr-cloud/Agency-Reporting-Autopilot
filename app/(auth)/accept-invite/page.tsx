import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Invalid Invite</h1>
        <p className="text-sm text-slate-500">
          This invite link is invalid or has expired.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Verify current user is authenticated
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/accept-invite?token=${token}`);
  }

  // In production: verify JWT token and update team_members record
  // For now: update the member's joined_at field
  await supabase
    .from("team_members")
    .update({ joined_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("joined_at", null);

  redirect("/dashboard?welcome=true");
}
