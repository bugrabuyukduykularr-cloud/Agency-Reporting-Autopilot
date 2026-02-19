import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data } = await supabase
    .from("reports")
    .select("status, pdf_url")
    .eq("public_link", token)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    pdf_url: data.pdf_url,
  });
}
