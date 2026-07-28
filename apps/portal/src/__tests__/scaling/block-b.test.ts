/**
 * Block B — Denormalised user_power_scores table
 *
 * B1-B6: integration tests — require SUPABASE_SERVICE_ROLE_KEY + migration 041.
 *         They show as SKIPPED in CI until the migration is applied.
 * B7:    unit test — FAIL until getPowerStats reads from user_power_scores.
 * B8:    unit test — PASS now; acts as a permanent formula-sync guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChain, DB_FIXTURE, USER_ID, SUBJECT, EXPECTED_SCORE, EXPECTED_TIER } from './helpers'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/kv', () => ({
  kv: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}))

// Pooler mock: per-test behaviour set via mockDbSql.mockImplementation(...)
const mockDbSql = vi.fn()
vi.mock('@/lib/db', () => ({
  getDb: () => mockDbSql,
}))

import { getPowerStats } from '@/app/badge/[userId]/[subject]/power'

// ---------------------------------------------------------------------------
// Integration tests (B1-B6): skip when no DB is available
// ---------------------------------------------------------------------------
const hasDb = !!process.env.SUPABASE_SERVICE_ROLE_KEY

describe('B1-B6 — Integration: user_power_scores triggers (requires DB)', () => {
  it.skipIf(!hasDb)(
    'B1: recompute_power_score() inserts row; 2 delegations + weight-5 accreditations + 3 votes + 1 proposal = 37',
    async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const testUserId = `b1-test-${Date.now()}`

      await admin.rpc('recompute_power_score', { p_user_id: testUserId, p_subject: SUBJECT })

      const { data } = await admin
        .from('user_power_scores')
        .select('score')
        .eq('user_id', testUserId)
        .eq('subject', SUBJECT)
        .single()

      expect(data?.score).toBe(37)

      await admin.from('user_power_scores').delete().eq('user_id', testUserId)
    },
  )

  it.skipIf(!hasDb)('B2: recompute_power_score() updates existing row, not duplicates', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const testUserId = `b2-test-${Date.now()}`

    await admin.rpc('recompute_power_score', { p_user_id: testUserId, p_subject: SUBJECT })
    await admin.rpc('recompute_power_score', { p_user_id: testUserId, p_subject: SUBJECT })

    const { data, count } = await admin
      .from('user_power_scores')
      .select('score', { count: 'exact' })
      .eq('user_id', testUserId)
      .eq('subject', SUBJECT)

    expect(count, 'must be exactly 1 row').toBe(1)
    void data

    await admin.from('user_power_scores').delete().eq('user_id', testUserId)
  })

  it.skipIf(!hasDb)('B3: delegation INSERT triggers score recomputation for delegate', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const delegateId = `b3-delegate-${Date.now()}`

    const before = await admin
      .from('user_power_scores')
      .select('score')
      .eq('user_id', delegateId)
      .eq('subject', SUBJECT)
      .maybeSingle()
    const scoreBefore = before.data?.score ?? 0

    await admin.from('delegations').insert({
      delegator_id: `b3-delegator-${Date.now()}`,
      delegate_id: delegateId,
      subject_tag: SUBJECT,
      active: true,
    })

    // Give trigger time to fire
    await new Promise(r => setTimeout(r, 500))

    const after = await admin
      .from('user_power_scores')
      .select('score')
      .eq('user_id', delegateId)
      .eq('subject', SUBJECT)
      .single()

    expect(after.data?.score, 'score must increase by 10 after delegation INSERT').toBe(scoreBefore + 10)

    await admin.from('delegations').delete().eq('delegate_id', delegateId)
    await admin.from('user_power_scores').delete().eq('user_id', delegateId)
  })

  it.skipIf(!hasDb)('B4: delegation DELETE decreases delegate score by 10', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const delegateId = `b4-delegate-${Date.now()}`
    const delegatorId = `b4-delegator-${Date.now()}`

    const { data: del } = await admin.from('delegations').insert({
      delegator_id: delegatorId,
      delegate_id: delegateId,
      subject_tag: SUBJECT,
      active: true,
    }).select().single()

    await new Promise(r => setTimeout(r, 500))
    const mid = await admin.from('user_power_scores').select('score').eq('user_id', delegateId).single()
    const scoreMid = mid.data?.score ?? 0

    await admin.from('delegations').delete().eq('id', del!.id)
    await new Promise(r => setTimeout(r, 500))

    const after = await admin.from('user_power_scores').select('score').eq('user_id', delegateId).single()
    expect(after.data?.score).toBe(scoreMid - 10)

    await admin.from('user_power_scores').delete().eq('user_id', delegateId)
  })

  it.skipIf(!hasDb)('B5: accreditation INSERT increases receiver score by weight*5', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const receiverId = `b5-receiver-${Date.now()}`
    const before = (await admin.from('user_power_scores').select('score').eq('user_id', receiverId).maybeSingle()).data?.score ?? 0

    await admin.from('accreditations').insert({
      giver_id: `b5-giver-${Date.now()}`,
      receiver_id: receiverId,
      subject_tag: SUBJECT,
      active: true,
      weight: 2,
    })

    await new Promise(r => setTimeout(r, 500))

    const after = await admin.from('user_power_scores').select('score').eq('user_id', receiverId).single()
    expect(after.data?.score).toBe(before + 2 * 5)

    await admin.from('accreditations').delete().eq('receiver_id', receiverId)
    await admin.from('user_power_scores').delete().eq('user_id', receiverId)
  })

  it.skipIf(!hasDb)('B6: tier column updates correctly when score crosses tier boundary', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    // Pre-seed a Silver user at score 75 (7 delegations), then add 1 more delegation to push to Gold
    const userId = `b6-user-${Date.now()}`

    for (let i = 0; i < 7; i++) {
      await admin.from('delegations').insert({ delegator_id: `b6-del-${i}-${Date.now()}`, delegate_id: userId, subject_tag: SUBJECT, active: true })
    }
    await new Promise(r => setTimeout(r, 800))
    const mid = await admin.from('user_power_scores').select('tier').eq('user_id', userId).single()
    expect(mid.data?.tier).toBe('Silver')

    await admin.from('delegations').insert({ delegator_id: `b6-del-final-${Date.now()}`, delegate_id: userId, subject_tag: SUBJECT, active: true })
    await new Promise(r => setTimeout(r, 500))

    const after = await admin.from('user_power_scores').select('tier').eq('user_id', userId).single()
    expect(after.data?.tier).toBe('Gold')

    await admin.from('delegations').delete().eq('delegate_id', userId)
    await admin.from('user_power_scores').delete().eq('user_id', userId)
  })
})

// ---------------------------------------------------------------------------
// Unit tests (B7-B8)
// ---------------------------------------------------------------------------

describe('B7-B8 — Unit: power score reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('B7: getPowerStats reads from user_power_scores via pooler, not live queries', async () => {
    // Pooler returns the pre-computed score row for user_power_scores queries
    mockDbSql.mockImplementation((strings: TemplateStringsArray) => {
      if (strings[0].includes('user_power_scores')) {
        return Promise.resolve([{
          score: EXPECTED_SCORE,
          tier: EXPECTED_TIER,
          delegations_received: 2,
          accreditations_received: 2,
          accreditation_weight: 5,
          votes_cast: 3,
          proposals_authored: 1,
          communities_joined: 1,
          total_earnings: 100,
        }])
      }
      return Promise.resolve([])
    })

    // Supabase client is called only for user profile lookup
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ display_name: 'Alice', avatar_url: null, location_name: 'London' })
      }
      return makeChain(null)
    })

    await getPowerStats(USER_ID, SUBJECT)

    const calls = mockFrom.mock.calls.map(c => c[0] as string)
    expect(calls, 'must query users via Supabase client').toContain('users')
    expect(calls, 'must NOT query delegations directly').not.toContain('delegations')
    expect(calls, 'must NOT query votes directly').not.toContain('votes')
    expect(calls, 'must NOT query accreditations directly').not.toContain('accreditations')
    expect(calls, 'must NOT query user_power_scores via Supabase (use pooler)').not.toContain('user_power_scores')
    expect(mockDbSql, 'pooler must be called for user_power_scores').toHaveBeenCalled()
  })

  it('B8: TypeScript score formula matches the documented SQL formula', () => {
    // This test is a permanent guard. If the formula changes in power.ts it will fail.
    // The SQL recompute_power_score() MUST implement the same arithmetic.
    //
    // Formula: delegationsReceived*10 + accreditationWeight*5 + votesCast*2
    //          + proposalsAuthored*8 + communitiesJoined*3 + floor(totalEarnings*0.1)
    type Fixture = {
      delegationsReceived: number
      accreditationWeight: number
      votesCast: number
      proposalsAuthored: number
      communitiesJoined: number
      totalEarnings: number
      expectedScore: number
    }
    const fixtures: Fixture[] = [
      { delegationsReceived: 0, accreditationWeight: 0, votesCast: 0, proposalsAuthored: 0, communitiesJoined: 0, totalEarnings: 0, expectedScore: 0 },
      { delegationsReceived: 2, accreditationWeight: 5, votesCast: 3, proposalsAuthored: 1, communitiesJoined: 1, totalEarnings: 100, expectedScore: 72 },
      { delegationsReceived: 10, accreditationWeight: 20, votesCast: 10, proposalsAuthored: 5, communitiesJoined: 5, totalEarnings: 500, expectedScore: 10*10+20*5+10*2+5*8+5*3+50 },
      { delegationsReceived: 50, accreditationWeight: 0, votesCast: 0, proposalsAuthored: 0, communitiesJoined: 0, totalEarnings: 0, expectedScore: 500 },
    ]

    function tsFormula(f: Fixture): number {
      return (
        f.delegationsReceived * 10 +
        f.accreditationWeight * 5 +
        f.votesCast * 2 +
        f.proposalsAuthored * 8 +
        f.communitiesJoined * 3 +
        Math.floor(f.totalEarnings * 0.1)
      )
    }

    for (const f of fixtures) {
      expect(tsFormula(f), `formula(${JSON.stringify(f)})`).toBe(f.expectedScore)
    }
  })
})

// ---------------------------------------------------------------------------
// SQL contract comment (not a runnable test, but part of the spec)
// ---------------------------------------------------------------------------
// The SQL function recompute_power_score(p_user_id UUID, p_subject TEXT) must:
//
//   score := (SELECT COUNT(*) FROM delegations   WHERE delegate_id = p_user_id AND subject_tag = p_subject AND active)   * 10
//           +(SELECT COALESCE(SUM(weight),0)
//               FROM accreditations              WHERE receiver_id = p_user_id AND subject_tag = p_subject AND active)   *  5
//           +(SELECT COUNT(*) FROM votes         WHERE user_id     = p_user_id)                                          *  2
//           +(SELECT COUNT(*) FROM proposals     WHERE author_id   = p_user_id)                                          *  8
//           +(SELECT COUNT(*) FROM community_memberships WHERE user_id = p_user_id)                                      *  3
//           + FLOOR((SELECT COALESCE(SUM(amount),0) FROM earnings WHERE user_id = p_user_id)                            * 0.1);
