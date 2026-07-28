/**
 * Block C — OG image caching + rate limiting
 *
 * C1-C3: Cache-Control header tests — FAIL until headers are added to OG routes
 * C4-C9: Rate limiting middleware tests — FAIL until @upstash/ratelimit middleware is added
 * C10:   Edge cache hit — skip unless PORTAL_URL is set (requires deployed preview)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// No top-level next/og mock needed — C1-C3 use source inspection (vitest
// cannot transform JSX in route.tsx files without a React plugin).

// ---------------------------------------------------------------------------
// Rate limiter mocks
// ---------------------------------------------------------------------------
const mockHtmlLimit = vi.fn()
const mockOgLimit = vi.fn()

vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class {
      limit: ReturnType<typeof vi.fn>
      constructor(opts: { prefix?: string }) {
        // Assign the correct mock based on prefix (set after construction via test setup)
        // The test overrides these via mockHtmlLimit / mockOgLimit
        this.limit = opts?.prefix === 'rl:og' ? mockOgLimit : mockHtmlLimit
      }
      static slidingWindow(_n: number, _w: string) {
        return {}
      }
    },
  }
})

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({}),
  },
}))

// Mock existing Supabase SSR middleware dependency
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeNextRequest(pathname: string, ip = '1.2.3.4') {
  const url = `http://localhost:3100${pathname}`
  const req = new Request(url, { headers: { 'x-forwarded-for': ip } })
  // Minimal NextRequest duck-type: add ip + nextUrl
  Object.defineProperty(req, 'ip', { value: ip, writable: false })
  Object.defineProperty(req, 'nextUrl', {
    value: { pathname },
    writable: false,
  })
  return req as unknown as import('next/server').NextRequest
}

const PORTAL_URL = process.env.PORTAL_URL
const hasPortal = !!PORTAL_URL

// ---------------------------------------------------------------------------
// C1-C3: Cache-Control headers — source inspection
// Vitest cannot transform JSX in route.tsx without a React plugin, so we
// verify the header strings are present in the source (same technique as E5-E6).
// ---------------------------------------------------------------------------

describe('C1-C3 — OG route cache headers', () => {
  it('C1: real OG route source includes s-maxage=3600 and stale-while-revalidate', async () => {
    // FAIL until Cache-Control headers are added to the real OG route
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/badge/[userId]/[subject]/og/route.tsx'),
      'utf-8',
    )
    expect(src, 'OG route must set s-maxage=3600').toMatch(/s-maxage=3600/)
    expect(src, 'OG route must set stale-while-revalidate').toMatch(/stale-while-revalidate/)
    expect(src, 'OG route must set Cache-Control via ImageResponse headers option').toMatch(/Cache-Control/)
  })

  it('C2: demo OG route source includes longer TTL (s-maxage=86400)', async () => {
    // FAIL until longer TTL is set on demo OG route
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/badge/demo/[tier]/[subject]/og/route.tsx'),
      'utf-8',
    )
    expect(src, 'Demo OG route must set s-maxage=86400').toMatch(/s-maxage=86400/)
    expect(src, 'Demo OG route must set stale-while-revalidate').toMatch(/stale-while-revalidate/)
  })

  it('C3: real OG route uses next/og ImageResponse (guarantees image/png Content-Type)', async () => {
    // ImageResponse from next/og always sets Content-Type: image/png.
    // We verify the route imports and uses it, not a plain Response.
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/badge/[userId]/[subject]/og/route.tsx'),
      'utf-8',
    )
    expect(src, 'Must import ImageResponse from next/og').toMatch(/from ['"]next\/og['"]/)
    expect(src, 'Must return new ImageResponse(...)').toMatch(/new ImageResponse\(/)
  })
})

// ---------------------------------------------------------------------------
// C4-C9: Rate limiting middleware
// ---------------------------------------------------------------------------

describe('C4-C9 — Rate limiting middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: requests succeed
    mockHtmlLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 30,
      reset: Date.now() + 60_000,
    })
    mockOgLimit.mockResolvedValue({
      success: true,
      limit: 300,
      remaining: 200,
      reset: Date.now() + 60_000,
    })
  })

  it('C4: badge page returns 200 (next()) when within rate limit', async () => {
    // FAIL until rate limiting middleware is added
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')
    mockHtmlLimit.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000 })

    const req = makeNextRequest('/badge/user-1/governance')
    const res = await middleware(req)

    expect(res?.status ?? 200, 'Must return 200 within rate limit').toBe(200)
  })

  it('C5: badge page returns 429 when rate limit exceeded', async () => {
    // FAIL until rate limiting middleware is added
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')
    const resetAt = Date.now() + 45_000
    mockHtmlLimit.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: resetAt })

    const req = makeNextRequest('/badge/user-1/governance')
    const res = await middleware(req)

    expect(res.status, 'Must return 429 when rate limit exceeded').toBe(429)
    const retryAfter = res.headers.get('Retry-After')
    expect(retryAfter, 'Must include Retry-After header').toBeTruthy()
    expect(Number(retryAfter), 'Retry-After must be positive seconds').toBeGreaterThan(0)
  })

  it('C6: OG routes have a higher rate limit tier than HTML badge routes', async () => {
    // FAIL until separate OG rate limiter with higher limit is wired up
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')

    // HTML badge: limited at 60/min — request 61 fails
    mockHtmlLimit.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: Date.now() + 60_000 })
    const htmlReq = makeNextRequest('/badge/user-1/governance')
    const htmlRes = await middleware(htmlReq)
    expect(htmlRes.status, 'HTML badge route should be rate-limited at 60/min').toBe(429)

    // OG route: limit is 300/min — same IP within that budget succeeds
    mockOgLimit.mockResolvedValue({ success: true, limit: 300, remaining: 100, reset: Date.now() + 60_000 })
    const ogReq = makeNextRequest('/badge/user-1/governance/og')
    const ogRes = await middleware(ogReq)
    expect(ogRes?.status ?? 200, 'OG route must have a higher limit and still be within it').toBe(200)
  })

  it('C7: rate limits are IP-scoped — different IPs have independent quotas', async () => {
    // FAIL until rate limiting middleware is added and keys are IP-scoped
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')

    // IP-A is rate-limited
    mockHtmlLimit.mockImplementation((ip: string) => {
      if (ip === '1.1.1.1') return Promise.resolve({ success: false, limit: 60, remaining: 0, reset: Date.now() + 60_000 })
      return Promise.resolve({ success: true, limit: 60, remaining: 30, reset: Date.now() + 60_000 })
    })

    const reqA = makeNextRequest('/badge/user-1/governance', '1.1.1.1')
    const resA = await middleware(reqA)
    expect(resA.status, 'IP-A must be rate-limited').toBe(429)

    const reqB = makeNextRequest('/badge/user-1/governance', '2.2.2.2')
    const resB = await middleware(reqB)
    expect(resB?.status ?? 200, 'IP-B must still be under its own quota').toBe(200)
  })

  it('C8: middleware does not rate-limit non-badge routes', async () => {
    // FAIL until middleware correctly scopes its limiter to /badge/ paths only
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')
    // Sanity: if the limiter were called on /login it might return 200 anyway,
    // but we assert it is NOT called at all.
    mockHtmlLimit.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: Date.now() })

    for (const path of ['/', '/login', '/api/some-route']) {
      vi.clearAllMocks()
      const req = makeNextRequest(path)
      const res = await middleware(req)
      expect(mockHtmlLimit, `Upstash must not be called for path ${path}`).not.toHaveBeenCalled()
      expect(res?.status ?? 200, `${path} must not be blocked`).not.toBe(429)
    }
  })

  it('C9: rate limiter fails open (200) when Upstash is unreachable', async () => {
    // FAIL until fail-open error handling is added to middleware
    const { middleware } = await import(/* @vite-ignore */ '@/middleware')
    mockHtmlLimit.mockRejectedValue(new Error('ECONNREFUSED upstash'))

    const req = makeNextRequest('/badge/user-1/governance')
    const res = await middleware(req)

    // Must not crash or return 5xx — fail open with 200
    expect(res?.status ?? 200, 'Must fail open (200) when Upstash is unreachable').not.toBe(500)
    expect(res?.status ?? 200, 'Must fail open (200), not 429').not.toBe(429)
  })
})

// ---------------------------------------------------------------------------
// C10: Vercel Edge cache — requires deployed preview URL
// ---------------------------------------------------------------------------

describe('C10 — Edge CDN cache hit (requires PORTAL_URL)', () => {
  it.skipIf(!hasPortal)('C10: second fetch of OG URL has X-Vercel-Cache: HIT', async () => {
    const url = `${PORTAL_URL}/badge/demo/gold/governance/og`
    // First fetch warms the cache
    await fetch(url)
    // Second fetch should hit the edge cache
    const res = await fetch(url)
    const cacheHeader = res.headers.get('X-Vercel-Cache') ?? res.headers.get('x-vercel-cache') ?? ''
    expect(cacheHeader.toUpperCase(), 'Second fetch must be served from edge cache').toBe('HIT')
  })
})
