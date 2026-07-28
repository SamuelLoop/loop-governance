/**
 * Block C — Incremental PageRank
 *
 * C1-C2, C6: integration tests — require SUPABASE_SERVICE_ROLE_KEY + migration 042.
 *            Show as SKIPPED until migration is applied.
 * C3-C5:     unit tests — FAIL until processQueue is implemented in the cron route.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChain } from './helpers'

vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

const mockFrom = vi.fn()

import { processQueue } from '@/app/api/cron/refresh-pagerank/process-queue'

const hasDb = !!process.env.SUPABASE_SERVICE_ROLE_KEY

// ---------------------------------------------------------------------------
// Integration tests (C1-C2, C6)
// ---------------------------------------------------------------------------

describe('C1-C2, C6 — Integration: queue triggers + nightly filter (requires DB)', () => {
  it.skipIf(!hasDb)('C1: accreditation INSERT enqueues job for receiver', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const receiverId = `c1-receiver-${Date.now()}`

    await admin.from('accreditations').insert({
      giver_id: `c1-giver-${Date.now()}`,
      receiver_id: receiverId,
      subject_tag: 'climate',
      active: true,
      weight: 1,
    })

    const { data } = await admin
      .from('accreditation_score_queue')
      .select('user_id')
      .eq('user_id', receiverId)

    expect(data?.length, 'queue must contain an entry for the receiver').toBeGreaterThan(0)

    await admin.from('accreditations').delete().eq('receiver_id', receiverId)
    await admin.from('accreditation_score_queue').delete().eq('user_id', receiverId)
  })

  it.skipIf(!hasDb)('C2: accreditation DELETE enqueues job for receiver', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const receiverId = `c2-receiver-${Date.now()}`
    const { data: acc } = await admin.from('accreditations').insert({
      giver_id: `c2-giver-${Date.now()}`,
      receiver_id: receiverId,
      subject_tag: 'climate',
      active: true,
      weight: 1,
    }).select().single()
    await admin.from('accreditation_score_queue').delete().eq('user_id', receiverId)

    await admin.from('accreditations').delete().eq('id', acc!.id)

    const { data } = await admin
      .from('accreditation_score_queue')
      .select('user_id')
      .eq('user_id', receiverId)

    expect(data?.length, 'queue must contain entry after accreditation DELETE').toBeGreaterThan(0)
    await admin.from('accreditation_score_queue').delete().eq('user_id', receiverId)
  })

  it.skipIf(!hasDb)('C6: nightly refresh only touches users active in last 24 h', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Inspect the SQL body for the active-user filter
    const { data } = await admin.rpc('get_function_definition', { func_name: 'refresh_all_accreditation_scores' }).single()
    const definition = (data as { definition?: string } | null)?.definition

    expect(
      definition ?? '',
      'function must filter by updated_at > now() - interval 24h',
    ).toMatch(/updated_at\s*>\s*now\(\)\s*-\s*interval\s*['"]24\s*h/)
  })
})

// ---------------------------------------------------------------------------
// Unit tests (C3-C5)
// ---------------------------------------------------------------------------

describe('C3-C5 — Unit: processQueue handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C3: processes all queued jobs and removes them from the queue', async () => {
    const queueRows = [
      { id: 1, user_id: 'u1' },
      { id: 2, user_id: 'u2' },
      { id: 3, user_id: 'u3' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'accreditation_score_queue') {
        return makeChain(queueRows, queueRows.length)
      }
      return makeChain(null)
    })

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockSupabase = { from: mockFrom, rpc: mockRpc }

    // FAIL until processQueue is implemented (currently throws 'Not implemented')
    const result = await processQueue(mockSupabase, 500)

    expect(result.processed).toBe(3)

    // After processing, queue rows must be deleted
    const deleteCalls = mockFrom.mock.calls.filter(c => c[0] === 'accreditation_score_queue')
    expect(deleteCalls.length, 'must interact with queue table at least twice (read + delete)').toBeGreaterThanOrEqual(2)
  })

  it('C4: processes 1,200 queued jobs in ceil(1200/500) = 3 batch passes', async () => {
    let readPassCount = 0
    const pool = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1, user_id: `u${i + 1}`, subject: 'climate' }))

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'accreditation_score_queue') return makeChain(null)
      // Lazy: only consume from pool when .select() fires, not on .delete()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let batch: typeof pool = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => { batch = pool.splice(0, 500); readPassCount++; return chain },
        delete: () => chain,
        order: () => chain,
        limit: () => chain,
        in: () => chain,
        eq: () => chain,
        then: (fn: (v: { data: typeof pool; count: number; error: null }) => unknown) =>
          Promise.resolve({ data: batch, count: batch.length, error: null }).then(fn),
        catch: (fn: (e: unknown) => unknown) =>
          Promise.resolve({ data: batch, count: batch.length, error: null }).catch(fn),
      }
      return chain
    })

    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockSupabase = { from: mockFrom, rpc: mockRpc }

    await processQueue(mockSupabase, 500)

    expect(readPassCount, 'must make exactly 3 batch read passes').toBe(3)
  })

  it('C5: deduplicates multiple queue entries for the same user_id', async () => {
    const rpcCallCount = { recompute: 0 }
    const queueRows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, user_id: 'same-user' }))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'accreditation_score_queue') return makeChain(queueRows, queueRows.length)
      return makeChain(null)
    })

    const mockRpc = vi.fn().mockImplementation((fn: string) => {
      if (fn === 'recompute_power_score') rpcCallCount.recompute++
      return Promise.resolve({ data: null, error: null })
    })

    const mockSupabase = { from: mockFrom, rpc: mockRpc }

    // FAIL until processQueue is implemented
    await processQueue(mockSupabase as any, 500)

    expect(
      rpcCallCount.recompute,
      'recompute_power_score must be called exactly once for deduplicated user_id',
    ).toBe(1)
  })
})
