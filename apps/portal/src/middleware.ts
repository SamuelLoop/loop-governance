import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";

const htmlRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:html",
});

const ogRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(300, "1 m"),
  prefix: "rl:og",
});

async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/badge/")) return null;

  const isOg = pathname.endsWith("/og");
  const limiter = isOg ? ogRatelimit : htmlRatelimit;
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      });
    }
  } catch {
    // Fail open: a broken rate limiter must not take down the badge page
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let supabaseResponse = NextResponse.next({ request });

  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
