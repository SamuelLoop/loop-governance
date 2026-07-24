import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  // Some auth providers deliver the code in the URL fragment or as a
  // hash-mangled querystring; grab from both places so this works with
  // Supabase's magic-link redirect even when the redirect_to itself
  // carried other query params.
  const code = searchParams.get("code");
  let next = searchParams.get("next");
  // If the pathname contains a stray ? from redirect_to concatenation,
  // scrape 'next' from the reassembled string too.
  if (!next && url.href.includes("?next=") && url.href.split("?next=").length > 2) {
    const rest = url.href.split("?next=")[2] ?? "";
    next = rest.split("&")[0] ?? null;
  }

  // Only accept same-origin relative redirects to prevent open-redirect abuse
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    const errorDesc =
      searchParams.get("error_description") || searchParams.get("error") || "no_code";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDesc)}`
    );
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return response;
}
