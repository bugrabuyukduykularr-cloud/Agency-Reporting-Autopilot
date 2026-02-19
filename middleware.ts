import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Routes that bypass ALL middleware checks
const PUBLIC_PREFIXES = [
  "/r/",
  "/api/stripe/webhook",
  "/api/cron/",
  "/api/track/",
];

// Routes exempt from plan enforcement
const PLAN_EXEMPT_PREFIXES = [
  "/settings",
  "/upgrade",
  "/api/stripe/",
  "/api/team/",
];

// Auth-required route prefixes
const APP_PREFIXES = [
  "/dashboard",
  "/clients",
  "/reports",
  "/settings",
  "/upgrade",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow fully public routes without session refresh
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Also allow public marketing pages
  if (
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  ) {
    return NextResponse.next();
  }

  // Refresh the Supabase auth session
  const { user, supabaseResponse } = await updateSession(request);

  // Protect app routes — redirect to /login if not authenticated
  const isAppRoute = APP_PREFIXES.some((p) => pathname.startsWith(p));
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to /dashboard
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Plan enforcement for authenticated app routes
  if (user && isAppRoute) {
    const isPlanExempt = PLAN_EXEMPT_PREFIXES.some((p) =>
      pathname.startsWith(p)
    );

    if (!isPlanExempt) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => request.cookies.getAll(),
              setAll: () => {},
            },
          }
        );

        const { data: member } = await supabase
          .from("team_members")
          .select("agency_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (member) {
          const { data: agency } = await supabase
            .from("agencies")
            .select("plan, trial_ends_at")
            .eq("id", member.agency_id)
            .single();

          if (agency) {
            // Trial expired
            if (
              agency.plan === "trial" &&
              agency.trial_ends_at &&
              new Date(agency.trial_ends_at) < new Date()
            ) {
              const url = request.nextUrl.clone();
              url.pathname = "/upgrade";
              return NextResponse.redirect(url);
            }

            // Cancelled subscription
            if (agency.plan === "cancelled") {
              const url = request.nextUrl.clone();
              url.pathname = "/upgrade";
              return NextResponse.redirect(url);
            }
          }
        }
      } catch {
        // Non-fatal — don't block navigation on plan-check errors
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
