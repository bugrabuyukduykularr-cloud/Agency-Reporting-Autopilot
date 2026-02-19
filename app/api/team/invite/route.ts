import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";
import { checkPlanLimits } from "@/lib/stripe/plans";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agency = await getAgency(supabase);
    if (!agency) {
      return NextResponse.json({ error: "No agency found" }, { status: 404 });
    }

    // Verify caller is owner or admin
    const { data: callerMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("agency_id", agency.id)
      .eq("user_id", user.id)
      .single();

    if (!callerMember || callerMember.role === "viewer") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { email, role } = (await request.json()) as {
      email: string;
      role: "admin" | "viewer";
    };

    if (!email || !["admin", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Check plan limits
    const { data: currentMembers } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id);

    const memberCount = currentMembers?.length ?? 0;
    const { canAddTeamMember } = checkPlanLimits(
      agency.plan,
      0,
      memberCount
    );

    if (!canAddTeamMember) {
      return NextResponse.json(
        {
          success: false,
          error: "Team member limit reached. Please upgrade your plan.",
        },
        { status: 400 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("agency_id", agency.id)
      .eq("user_id", email)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "This user is already a team member" },
        { status: 400 }
      );
    }

    // For now, create a pending team_members record
    // In production you'd look up the user by email, create if needed, etc.
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        agency_id: agency.id,
        user_id: user.id, // placeholder — would be the invited user's ID
        role,
        invited_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[team/invite]", insertError.message);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // In production: send invite email via Resend

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invite error";
    console.error("[team/invite]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
