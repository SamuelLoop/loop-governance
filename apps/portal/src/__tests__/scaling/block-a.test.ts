/**
 * Block A — KV caching
 *
 * Tests A1-A5 will FAIL until Problem 1 is implemented:
 *   apps/portal/src/lib/kv.ts           (real @vercel/kv wrapper)
 *   apps/portal/src/app/badge/…/power.ts (wrapped with kv.get / kv.set / kv.del)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChain, DB_FIXTURE, USER_ID, SUBJECT } from './helpers'

// vi.mock is hoisted above imports by vitest — declare all mocks here
const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/kv', () => ({
  kv: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}))

// Mock pooler: return [] for all queries (triggers computeLive path; computeLive
// falls back to Supabase for aggregates, pooler for user_vote_proposal_counts).
vi.mock('@/lib/db', () => ({
  getDb: () => (_strings: TemplateStringsArray) => Promise.resolve([]),
}))

import { getPowerStats } from '@/app/badge/[userId]/[subject]/power'
import { kv } from '@/lib/kv'

const CACHED: Record<string, unknown> = {
  userName: 'Alice', avatarUrl: null, location: 'London', subject: SUBJECT,
  delegationsReceived: 3, accreditationsReceived: 2, accreditationWeight: 5,
  votesCast: 3, proposalsAuthored: 1, communitiesJoined: 1, totalEarnings: 100,
  powerScore: 72, tier: 'Silver', tierColor: '#94a3b8', tierGlow: 'rgba(148,163,184,0.3)',
}

function setupDb() {
  mockFrom.mockImplementation((table: string) => {
    const row = DB_FIXTURE[table]
    return makeChain(row?.data ?? null, row?.count ?? 0)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('A — KV cache', () => {
  it('A1: returns cached value without hitting Supabase', async () => {
    vi.mocked(kv.get).mockResolvedValue(CACHED)
    setupDb() // needed so getPowerStats can complete if KV miss path runs

    const result = await getPowerStats(USER_ID, SUBJECT)

    // FAIL until KV wrapping exists: getPowerStats currently always calls Supabase
    expect(mockFrom, 'Supabase must not be queried on a cache hit').not.toHaveBeenCalled()
    expect(result).toEqual(CACHED)
  })

  it('A2: writes to KV on cache miss', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)
    setupDb()

    await getPowerStats(USER_ID, SUBJECT)

    // FAIL until KV wrapping exists: kv.set is never called in current implementation
    expect(kv.set).toHaveBeenCalledWith(
      `power:${USER_ID}:${SUBJECT}`,
      expect.any(Object),
      expect.objectContaining({ ex: expect.any(Number) }),
    )
  })

  it('A3: KV cache TTL is ≤ 5 minutes (300 s)', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)
    setupDb()

    await getPowerStats(USER_ID, SUBJECT)

    const setCall = vi.mocked(kv.set).mock.calls[0]
    const opts = setCall?.[2] as { ex?: number } | undefined
    // FAIL until KV wrapping exists
    expect(opts?.ex, 'TTL must be ≤ 300').toBeDefined()
    expect(opts!.ex).toBeLessThanOrEqual(300)
  })

  it('A4: invalidatePowerCache deletes the KV key', async () => {
    vi.mocked(kv.del).mockResolvedValue(1)

    // FAIL until invalidatePowerCache is exported from power.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('@/app/badge/[userId]/[subject]/power') as any
    const invalidate: ((u: string, s: string) => Promise<void>) | undefined = mod.invalidatePowerCache
    expect(invalidate, 'invalidatePowerCache must be exported from power.ts').toBeDefined()

    await invalidate!(USER_ID, SUBJECT)
    expect(kv.del).toHaveBeenCalledWith(`power:${USER_ID}:${SUBJECT}`)
  })

  it('A5: falls back to live DB queries when KV.get throws', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('KV connection refused'))
    setupDb()

    // FAIL until KV wrapping exists: kv.get is not called at all currently,
    // so this assertion catches the "not yet implemented" case.
    const result = await getPowerStats(USER_ID, SUBJECT)

    expect(kv.get, 'kv.get must be attempted even when it will throw').toHaveBeenCalledWith(
      `power:${USER_ID}:${SUBJECT}`,
    )
    expect(result, 'result must not be null after KV failure').not.toBeNull()
  })
})
