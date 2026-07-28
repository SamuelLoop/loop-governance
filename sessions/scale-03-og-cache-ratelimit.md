# Loop Governance: OG image caching + rate limiting — 2026-07-28

## Context

The Loop Governance platform (`/Users/samuelbarlow/Documents/Coding Loop Enrolment/loop-governance`)
has a public OG image route at `gov.loopcmbntr.live/badge/{userId}/{subject}/og`
that generates a 1200x630 PNG on every request using Satori + Next.js
`ImageResponse`. This route is called by WhatsApp, Twitter, Facebook, LinkedIn,
iMessage, and Telegram every time someone shares a badge link.

The mobile app (`apps/mobile`) shares badge links via the native share sheet
(`navigator.share()` / React Native `Share.share()`). These links resolve to
`gov.loopcmbntr.live/badge/{userId}/{subject}` and WhatsApp, iMessage, and
Telegram unfurl them by hitting the `/og` route. Mobile is a direct multiplier
on OG route traffic.

Two problems at scale:

1. **No caching.** Every link unfurl triggers a full Satori render. A viral badge
   link shared by a Diamond-tier user could trigger thousands of OG renders per
   minute. There is no `Cache-Control` header telling CDNs to cache the result.

2. **No rate limiting.** The badge page itself (`/badge/{userId}/{subject}`) also
   runs 6-12 Supabase queries per load with no rate limiting. A bad actor or a
   viral spike can exhaust the Supabase connection pool.

This session adds:
- `Cache-Control` headers to OG image routes (CDN-cacheable, 1-hour TTL)
- Vercel middleware rate limiting on the public badge and OG routes
- Stale-while-revalidate semantics so cached OG images stay fresh

---

## What exists today (read these files first)

| File | Role |
|---|---|
| `apps/portal/src/app/badge/[userId]/[subject]/og/route.tsx` | OG image route — no cache headers |
| `apps/portal/src/app/badge/demo/[tier]/[subject]/og/route.tsx` | Demo OG route — no cache headers |
| `apps/portal/src/middleware.ts` | May or may not exist — check before creating |
| `apps/portal/next.config.ts` | Check for existing headers config |

---

## Change 1: Cache-Control headers on OG routes

In both OG route files, the `ImageResponse` constructor accepts a `headers`
option. Add:

```ts
return new ImageResponse(
  jsx,
  {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  }
);
```

- `max-age=3600` — Vercel Edge Network and downstream CDNs cache for 1 hour
- `stale-while-revalidate=86400` — serve stale while regenerating in background
  for up to 24 hours after expiry; user never waits for a regeneration

For the real badge OG route (not demo), also add `s-maxage=3600` for Vercel's
shared cache layer:
```
"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
```

For demo OG routes, scores never change so use a longer TTL:
```
"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
```

---

## Change 2: Rate limiting via Vercel middleware

Install:
```
pnpm add @upstash/ratelimit @upstash/redis --filter portal
```

Required env vars (add via `vercel env add` in the `loop-governance` project):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Create or update `apps/portal/src/middleware.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute per IP
  analytics: false,
});

const RATE_LIMITED_PATHS = ["/badge/"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const shouldLimit = RATE_LIMITED_PATHS.some(p => pathname.startsWith(p));
  if (!shouldLimit) return NextResponse.next();

  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/badge/:path*"],
};
```

Note: Vercel middleware runs at the Edge; `@upstash/ratelimit` with Upstash Redis
is the standard choice because it works in the Edge runtime. Do not use `ioredis`
or `pg` in middleware.

---

## Change 3: Separate rate limit tier for OG routes

OG routes are called by crawlers (WhatsApp, Twitter bots), not humans. Give them
a higher per-IP limit and a separate key so bot traffic does not starve human
badge page views:

```ts
const htmlRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:html",
});

const ogRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(300, "1 m"), // crawlers hit harder
  prefix: "rl:og",
});

const isOg = pathname.endsWith("/og");
const limiter = isOg ? ogRatelimit : htmlRatelimit;
```

---

## TDD test suite

Place tests in `apps/portal/src/__tests__/scaling/og-cache.test.ts`.

```
C1  OG route returns Cache-Control header
    GET /badge/{userId}/{subject}/og
    Assert: response header Cache-Control includes 's-maxage=3600'
    Assert: response header Cache-Control includes 'stale-while-revalidate'

C2  Demo OG route returns longer Cache-Control TTL
    GET /badge/demo/gold/governance/og
    Assert: response header Cache-Control includes 's-maxage=86400'

C3  OG route returns Content-Type: image/png
    GET /badge/{userId}/{subject}/og
    Assert: Content-Type header equals 'image/png'

C4  Badge page returns 200 within rate limit
    Fire 59 requests to /badge/{userId}/{subject} from same IP in 1 minute
    Assert: all 59 return HTTP 200

C5  Badge page returns 429 when rate limit exceeded
    Fire 61 requests to /badge/{userId}/{subject} from same IP in 1 minute
    Assert: request 61 returns HTTP 429
    Assert: response includes Retry-After header

C6  OG route has higher rate limit than HTML badge page
    Fire 200 requests to /badge/{userId}/{subject}/og from same IP in 1 minute
    Assert: requests 1-300 return HTTP 200 (OG limit is 300/min)
    Assert: only requests beyond 300 return 429

C7  Rate limits are IP-scoped (different IPs are independent)
    Fire 61 requests from IP-A and 61 requests from IP-B concurrently
    Assert: IP-A's 61st request returns 429
    Assert: IP-B's 61st request returns 429 (they don't share quota)

C8  Middleware does not run on non-badge routes
    GET /login, GET /, GET /api/some-route
    Assert: no rate-limit headers in response
    Assert: Upstash is not called (verify via mock)

C9  Rate limiter fails open when Upstash is unreachable
    Mock Upstash to throw a network error
    GET /badge/{userId}/{subject}
    Assert: returns HTTP 200 (not 500, not 429)
    Assert: error is logged but not propagated

C10 Vercel Edge caches OG image (end-to-end)
    Fetch the same OG URL twice
    Assert: second response has X-Vercel-Cache: HIT header
    (Run this test against the deployed Vercel preview URL, not localhost)
```

---

## Key constraints

- Upstash Redis is required for Edge-compatible rate limiting — standard Redis
  clients do not work in Vercel middleware (Edge runtime, no Node.js APIs)
- The rate limiter must fail open (return 200) when Upstash is unavailable;
  a broken rate limiter must not take down the badge page
- OG routes are read-only and safe to cache aggressively; badge HTML pages are
  also read-only and safe to cache at the CDN level
- Do not add rate limiting to authenticated console routes — only public portal
  routes under `/badge/`
- Check `apps/portal/src/middleware.ts` exists before creating it — if the file
  already exists, extend it rather than replacing it
