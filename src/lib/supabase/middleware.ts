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

  // If the user has 2FA enrolled but this session is only at aal1, they must still
  // enter their code. (Fail open on a transient error so a hiccup can't lock everyone out.)
  let needsStepUp = false;
  if (user) {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      needsStepUp = !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    } catch {
      needsStepUp = false;
    }
  }

  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  // Auth-flow pages are exempt from the guards below (you complete auth on them).
  const isAuthPage = isLogin || pathname.startsWith("/admin/reset");

  // Not signed in, or signed in but still owes a 2FA code → send to login.
  if (isAdmin && !isAuthPage && (!user || needsStepUp)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Fully authenticated but sitting on the login page → send to the dashboard.
  // (If they still owe a 2FA code, let them stay so the login page can prompt for it.)
  if (isLogin && user && !needsStepUp) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
