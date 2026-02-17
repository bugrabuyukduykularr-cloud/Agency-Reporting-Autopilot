import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CompleteBody {
  pendingRef: string;
  propertyId: string;
  propertyName: string;
  clientId: string;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { pendingRef, propertyId, propertyName, clientId } = body;

  const { data: pending, error: pendingError } = await supabase
    .from("oauth_pending")
    .select("*")
    .eq("id", pendingRef)
    .eq("client_id", clientId)
    .single();

  if (pendingError || !pending) {
    return NextResponse.json(
      {
        error:
          "Invalid or expired connection session. Please start again.",
      },
      { status: 404 }
    );
  }

  const { data: existing } = await supabase
    .from("data_connections")
    .select("id")
    .eq("client_id", clientId)
    .eq("platform", "linkedin_ads")
    .single();

  const connectionData = {
    client_id: pending.client_id as string,
    agency_id: pending.agency_id as string,
    platform: "linkedin_ads" as const,
    account_id: propertyId,
    account_name: propertyName,
    access_token: pending.access_token as string,
    refresh_token: pending.refresh_token as string | null,
    token_expires_at: pending.token_expires_at as string | null,
    scopes: ["r_ads", "r_ads_reporting", "r_organization_social"],
    status: "connected" as const,
    last_synced_at: null,
    error_message: null,
  };

  if (existing) {
    await supabase
      .from("data_connections")
      .update(connectionData)
      .eq("id", existing.id as string);
  } else {
    await supabase.from("data_connections").insert(connectionData);
  }

  await supabase.from("oauth_pending").delete().eq("id", pendingRef);

  return NextResponse.json({ success: true });
}
