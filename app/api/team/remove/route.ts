import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgency } from "@/lib/supabase/queries";

export async function DELETE(request: Request) {
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

    const { teamMemberId } = (await request.json()) as {
      teamMemberId: string;
    };

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "teamMemberId required" },
        { status: 400 }
      );
    }

    // Check that target member exists and is not owner
    const { data: target } = await supabase
      .from("team_members")
      .select("role, user_id")
      .eq("id", teamMemberId)
      .eq("agency_id", agency.id)
      .single();

    if (!target) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (target.role === "owner") {
      return NextResponse.json(
        { success: false, error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", teamMemberId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Remove error";
    console.error("[team/remove]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
