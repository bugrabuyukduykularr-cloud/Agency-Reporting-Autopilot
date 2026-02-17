import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuthState } from "@/lib/oauth/state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const agencyId = searchParams.get("agencyId");

  if (!clientId || !agencyId) {
    return NextResponse.json(
      { error: "Missing clientId or agencyId" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const state = await createOAuthState(
    supabase,
    clientId,
    agencyId,
    "meta_ads",
    user.id
  );

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    state,
    scope: "ads_read,read_insights,business_management",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
