import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DisconnectBody {
  connectionId: string;
  clientId: string;
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DisconnectBody;
  try {
    body = (await request.json()) as DisconnectBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { connectionId, clientId } = body;

  // Validate user owns the agency that owns the client
  const { data: client } = await supabase
    .from("clients")
    .select("agency_id")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("agency_id", client.agency_id as string)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("data_connections")
    .delete()
    .eq("id", connectionId)
    .eq("client_id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
