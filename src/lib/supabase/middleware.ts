// Refreshes the Supabase auth session on every request and guards /admin routes.
// Anyone hitting /admin/* without a valid session is bounced to the login page.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser() — it refreshes the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  // Auth-flow pages complete sign-in, so they're exempt from the "must be signed in" guard.
  const isAuthPage =
    pathname.startsWith("/admin/login") || pathname.startsWith("/admin/reset");

  // Not signed in and trying to reach a protected admin page → login.
  // (2FA enforcement + "already-signed-in → dashboard" both live in the app layer:
  //  requireProfile() guards portal pages and the login page redirects signed-in users.
  //  Keeping that out of edge middleware avoids DB access here and redirect loops.)
  if (isAdmin && !isAuthPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
