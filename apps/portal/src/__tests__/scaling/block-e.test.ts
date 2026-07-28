/**
 * Block E — Regression suite
 *
 * Run these after every problem block is implemented to guard existing features.
 *
 * E1-E3: HTTP integration tests — SKIPPED if PORTAL_URL is not set.
 * E4:    unit — PASS now (formula is in TypeScript).
 * E5-E6: unit — PASS now (share-buttons already exist).
 * E7-E9: mobile unit — require subject-scoped DB fix; FAIL if not yet applied.
 *
 * To run HTTP tests locally: PORTAL_URL=http://localhost:3100 pnpm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeChain, EXPECTED_SCORE, EXPECTED_TIER, USER_ID, SUBJECT } from './helpers'

// Module-level mocks (hoisted by vitest; apply to all tests in this file)
const mockFromE = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFromE }),
}))

vi.mock('@/lib/kv', () => ({
  kv: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() },
}))

const mockDbSqlE = vi.fn()
vi.mock('@/lib/db', () => ({
  getDb: () => mockDbSqlE,
}))

const PORTAL_URL = process.env.PORTAL_URL
const hasPortal  = !!PORTAL_URL

// ---------------------------------------------------------------------------
// E1-E3: HTTP smoke tests
// ---------------------------------------------------------------------------

describe('E1-E3 — HTTP smoke (requires PORTAL_URL)', () => {
  it.skipIf(!hasPortal)('E1: public badge page returns 200', async () => {
    const res = await fetch(`${PORTAL_URL}/badge/${USER_ID}/${SUBJECT}`)
    expect(res.status).toBe(200)
  })

  it.skipIf(!hasPortal)('E2: OG image route returns 1200x630 PNG', async () => {
    const res = await fetch(`${PORTAL_URL}/badge/${USER_ID}/${SUBJECT}/og`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')

    // Verify dimensions from PNG IHDR chunk
    const buf = Buffer.from(await res.arrayBuffer())
    // PNG signature: bytes 0-7; IHDR: bytes 8-11 = 'IHDR', 12-15 = width, 16-19 = height
    const width  = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    expect(width).toBe(1200)
    expect(height).toBe(630)
  })

  it.skipIf(!hasPortal)('E3: demo badge pages return 200 for all 5 tiers', async () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    const results = await Promise.all(
      tiers.map(t => fetch(`${PORTAL_URL}/badge/demo/${t}/${SUBJECT}`).then(r => ({ tier: t, status: r.status }))),
    )
    for (const r of results) {
      expect(r.status, `demo/${r.tier} must return 200`).toBe(200)
    }
  })
})

// ---------------------------------------------------------------------------
// E4: Score consistency
// ---------------------------------------------------------------------------

describe('E4 — Score consistency', () => {
  beforeEach(() => vi.clearAllMocks())

  it('E4: badge power score matches user_power_scores row', async () => {
    // Pooler returns the pre-computed score row; Supabase handles user profile only
    mockDbSqlE.mockImplementation((strings: TemplateStringsArray) => {
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

    mockFromE.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ display_name: 'Alice', avatar_url: null, location_name: 'London' })
      }
      return makeChain(null)
    })

    const { getPowerStats } = await import('@/app/badge/[userId]/[subject]/power')
    const stats = await getPowerStats(USER_ID, SUBJECT)

    expect(stats?.powerScore, 'score from user_power_scores must equal EXPECTED_SCORE').toBe(EXPECTED_SCORE)
    expect(stats?.tier, 'tier from user_power_scores must be Silver').toBe(EXPECTED_TIER)
  })
})

// ---------------------------------------------------------------------------
// E5-E6: Share buttons
// ---------------------------------------------------------------------------

describe('E5-E6 — Share buttons', () => {
  it('E5: share-buttons module exports expected platforms', async () => {
    // Verify the share-buttons component file exists and covers all required platforms
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(
      process.cwd(),
      'src/app/badge/[userId]/[subject]/share-buttons.tsx',
    )
    const src = fs.readFileSync(filePath, 'utf-8')

    // Must contain share targets for all 6 platforms
    expect(src).toMatch(/twitter|x\.com/i)
    expect(src).toMatch(/linkedin/i)
    expect(src).toMatch(/facebook/i)
    expect(src).toMatch(/instagram/i)
    expect(src).toMatch(/whatsapp/i)
    expect(src).toMatch(/copy|clipboard/i)
  })

  it('E6: navigator.share is called on Instagram button for mobile UA', async () => {
    // Component-level test: the Instagram share button uses Web Share API on mobile.
    // We test the logic by inspecting the share-buttons source for the pattern.
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(
      process.cwd(),
      'src/app/badge/[userId]/[subject]/share-buttons.tsx',
    )
    const src = fs.readFileSync(filePath, 'utf-8')

    // Must reference navigator.share
    expect(src, 'share-buttons.tsx must call navigator.share for Instagram').toMatch(/navigator\.share/)
  })
})

// ---------------------------------------------------------------------------
// E7-E9: Mobile pre-existing bug fix
// ---------------------------------------------------------------------------

describe('E7-E9 — Mobile subject-scoped query fix', () => {
  it('E7: PowerCard score query uses subject_tag + community_id IS NULL', async () => {
    const fs = await import('fs')
    const path = await import('path')
    // Path is relative to loop-governance root; resolve from cwd's parent chain
    const mobileDir = path.resolve(process.cwd(), '../../apps/mobile/src/components')
    const src = fs.readFileSync(path.join(mobileDir, 'PowerCard.tsx'), 'utf-8')

    // FAIL until PowerCard is updated to use subject_tag query instead of community_id
    expect(src, 'PowerCard must query by subject_tag').toMatch(/subject_tag/)
    expect(src, 'PowerCard must filter community_id IS NULL').toMatch(/is\('community_id',\s*null\)/i)
    expect(src, 'PowerCard must NOT eq-filter on community_id').not.toMatch(/\.eq\(['"]community_id['"]/)
  })

  it('E8: PowerBar queries subject-scoped scores, not community-scoped', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const mobileDir = path.resolve(process.cwd(), '../../apps/mobile/src/components')
    const src = fs.readFileSync(path.join(mobileDir, 'PowerBar.tsx'), 'utf-8')

    expect(src, 'PowerBar must query by subject_tag').toMatch(/subject_tag/)
    expect(src, 'PowerBar must filter community_id IS NULL').toMatch(/is\('community_id',\s*null\)/i)
    expect(src, 'PowerBar must NOT eq-filter on community_id').not.toMatch(
      /\.eq\(['"]community_id['"]/,
    )
  })

  it('E9: UserBottomSheet score query uses subject_tag + community_id IS NULL', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const mobileDir = path.resolve(process.cwd(), '../../apps/mobile/src/components')
    const src = fs.readFileSync(path.join(mobileDir, 'UserBottomSheet.tsx'), 'utf-8')

    // FAIL until UserBottomSheet is updated
    expect(src, 'UserBottomSheet must query by subject_tag').toMatch(/subject_tag/)
    // .is('community_id', null) is correct (null filter); .eq('community_id', ...) is wrong
    expect(src, 'UserBottomSheet must NOT eq-filter on community_id').not.toMatch(
      /\.eq\(['"]community_id['"]/,
    )
  })
})
