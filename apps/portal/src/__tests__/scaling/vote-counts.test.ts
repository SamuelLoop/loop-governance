/**
 * Vote-counts materialisation (scale-02)
 *
 * V1-V7, V9-V10: Assert the migration SQL (043_materialised_vote_counts.sql)
 *   contains the correct trigger logic. Observable pass/fail without a live DB.
 * V8:  Source-file assertions — badge page and power.ts use materialised tables.
 * V11: HTTP smoke — skipped unless PORTAL_URL is set.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const MIGRATION = path.resolve(
  process.cwd(),
  '../../packages/db/migrations/043_materialised_vote_counts.sql',
)
const BADGE_PAGE = path.resolve(
  process.cwd(),
  '../../apps/console/src/app/(dashboard)/badge/page.tsx',
)
const POWER_TS = path.resolve(
  process.cwd(),
  'src/app/badge/[userId]/[subject]/power.ts',
)

const PORTAL_URL = process.env.PORTAL_URL
const hasPortal = !!PORTAL_URL

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _sql: string | undefined
function sql(): string {
  if (!_sql) _sql = fs.readFileSync(MIGRATION, 'utf-8')
  return _sql
}

// ---------------------------------------------------------------------------
// V1-V2: proposal_vote_counts — INSERT trigger (upsert accumulation)
// ---------------------------------------------------------------------------

describe('V1-V2 — proposal_vote_counts INSERT trigger', () => {
  it('V1: migration creates trg_update_proposal_vote_counts function', () => {
    expect(sql(), 'trigger function must exist').toMatch(
      /CREATE OR REPLACE FUNCTION trg_update_proposal_vote_counts/,
    )
    expect(sql(), 'trigger must fire AFTER INSERT OR DELETE ON votes').toMatch(
      /AFTER INSERT OR DELETE ON votes/,
    )
  })

  it('V2: INSERT branch upserts into proposal_vote_counts with accumulation', () => {
    expect(sql(), 'must INSERT for first vote').toMatch(
      /INSERT INTO proposal_vote_counts/,
    )
    expect(sql(), 'must accumulate for_count on conflict').toMatch(
      /for_count\s*=\s*proposal_vote_counts\.for_count\s*\+\s*EXCLUDED\.for_count/,
    )
    expect(sql(), 'must accumulate against_count on conflict').toMatch(
      /against_count\s*=\s*proposal_vote_counts\.against_count\s*\+\s*EXCLUDED\.against_count/,
    )
    expect(sql(), 'must accumulate abstain_count on conflict').toMatch(
      /abstain_count\s*=\s*proposal_vote_counts\.abstain_count\s*\+\s*EXCLUDED\.abstain_count/,
    )
  })
})

// ---------------------------------------------------------------------------
// V3-V4: proposal_vote_counts — DELETE trigger and GREATEST guard
// ---------------------------------------------------------------------------

describe('V3-V4 — proposal_vote_counts DELETE trigger', () => {
  it('V3: DELETE branch decrements the correct choice bucket', () => {
    expect(sql(), 'DELETE branch must update for_count').toMatch(
      /TG_OP = 'DELETE'/,
    )
    expect(sql(), 'DELETE branch must reference OLD.proposal_id').toMatch(
      /WHERE proposal_id = OLD\.proposal_id/,
    )
    expect(sql(), 'DELETE branch must reference OLD.choice for for_count').toMatch(
      /OLD\.choice = 'for'/,
    )
    expect(sql(), 'DELETE branch must reference OLD.choice for against_count').toMatch(
      /OLD\.choice = 'against'/,
    )
  })

  it('V4: GREATEST(0, ...) prevents counts going below zero', () => {
    const greatestCount = (sql().match(/GREATEST\(0,/g) ?? []).length
    expect(
      greatestCount,
      'GREATEST(0, ...) must appear for each of the three choice buckets',
    ).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// V5-V6: user_vote_proposal_counts — votes and proposals INSERT triggers
// ---------------------------------------------------------------------------

describe('V5-V6 — user_vote_proposal_counts INSERT triggers', () => {
  it('V5: votes INSERT trigger increments votes_cast using voter_id', () => {
    expect(sql(), 'user counts trigger function must exist').toMatch(
      /CREATE OR REPLACE FUNCTION trg_update_user_counts/,
    )
    expect(sql(), 'votes branch must use voter_id').toMatch(
      /VALUES \(NEW\.voter_id, 1\)/,
    )
    expect(sql(), 'votes branch must increment votes_cast').toMatch(
      /votes_cast = user_vote_proposal_counts\.votes_cast \+ 1/,
    )
    expect(sql(), 'trigger must fire AFTER INSERT ON votes').toMatch(
      /AFTER INSERT ON votes/,
    )
  })

  it('V6: proposals INSERT trigger increments proposals_authored using author_id', () => {
    expect(sql(), 'proposals branch must use author_id').toMatch(
      /VALUES \(NEW\.author_id, 1\)/,
    )
    expect(sql(), 'proposals branch must increment proposals_authored').toMatch(
      /proposals_authored = user_vote_proposal_counts\.proposals_authored \+ 1/,
    )
    expect(sql(), 'trigger must fire AFTER INSERT ON proposals').toMatch(
      /AFTER INSERT ON proposals/,
    )
  })
})

// ---------------------------------------------------------------------------
// V7: Backfill SQL
// ---------------------------------------------------------------------------

describe('V7 — Backfill SQL', () => {
  it('V7: backfill inserts user_vote_proposal_counts from votes and proposals', () => {
    expect(sql(), 'backfill must insert into user_vote_proposal_counts').toMatch(
      /INSERT INTO user_vote_proposal_counts/,
    )
    expect(sql(), 'backfill must LEFT JOIN votes by voter_id').toMatch(
      /LEFT JOIN.*votes.*GROUP BY voter_id/s,
    )
    expect(sql(), 'backfill must LEFT JOIN proposals by author_id').toMatch(
      /LEFT JOIN.*proposals.*GROUP BY author_id/s,
    )
    expect(sql(), 'backfill must insert into proposal_vote_counts').toMatch(
      /INSERT INTO proposal_vote_counts/,
    )
    expect(sql(), 'proposal backfill must count by choice for each bucket').toMatch(
      /COUNT\(\*\) FILTER \(WHERE choice = 'for'\)/,
    )
  })
})

// ---------------------------------------------------------------------------
// V8: Application layer reads from materialised tables (source-file assertions)
// ---------------------------------------------------------------------------

describe('V8 — Badge page reads from materialised table', () => {
  it('V8a: console badge page queries user_vote_proposal_counts', () => {
    const src = fs.readFileSync(BADGE_PAGE, 'utf-8')
    expect(src, 'badge page must read from user_vote_proposal_counts').toMatch(
      /user_vote_proposal_counts/,
    )
  })

  it('V8b: console badge page does not run COUNT(*) on votes for vote counting', () => {
    const src = fs.readFileSync(BADGE_PAGE, 'utf-8')
    expect(
      src,
      'badge page must not query votes table directly for counting',
    ).not.toMatch(/from\("votes"\)/)
  })

  it('V8c: console badge page does not run COUNT(*) on proposals for proposal counting', () => {
    const src = fs.readFileSync(BADGE_PAGE, 'utf-8')
    expect(
      src,
      'badge page must not query proposals table directly for counting',
    ).not.toMatch(/from\("proposals"\)/)
  })

  it('V8d: portal power.ts computeLive reads from user_vote_proposal_counts', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    expect(src, 'power.ts computeLive must read from user_vote_proposal_counts').toMatch(
      /user_vote_proposal_counts/,
    )
  })

  it('V8e: portal power.ts computeLive does not query votes table for counting', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    // The computeLive fallback must not use .from("votes") for counting;
    // it should read votes_cast from the materialised table instead.
    expect(
      src,
      'power.ts must not query votes table directly in the live fallback',
    ).not.toMatch(/\.from\("votes"\)/)
  })

  it('V8f: portal power.ts computeLive does not query proposals table for counting', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    expect(
      src,
      'power.ts must not query proposals table directly in the live fallback',
    ).not.toMatch(/\.from\("proposals"\)/)
  })
})

// ---------------------------------------------------------------------------
// V9: Race-condition safety (atomic upsert)
// ---------------------------------------------------------------------------

describe('V9 — Concurrent insert safety', () => {
  it('V9: trigger uses ON CONFLICT DO UPDATE (atomic), not separate SELECT + UPDATE', () => {
    // ON CONFLICT with column arithmetic is atomic at the Postgres level;
    // a separate SELECT + UPDATE would create a TOCTOU race at high concurrency.
    const upsertCount = (sql().match(/ON CONFLICT.*?DO UPDATE/gs) ?? []).length
    expect(
      upsertCount,
      'must have at least two ON CONFLICT DO UPDATE upserts (proposal counts + user counts)',
    ).toBeGreaterThanOrEqual(2)
    expect(sql(), 'trigger must not use a SELECT before the UPDATE (read-modify-write anti-pattern)').not.toMatch(
      /SELECT.*FROM proposal_vote_counts.*WHERE proposal_id/s,
    )
  })
})

// ---------------------------------------------------------------------------
// V10: CASCADE delete removes proposal_vote_counts rows
// ---------------------------------------------------------------------------

describe('V10 — CASCADE on proposal delete', () => {
  it('V10: proposal_vote_counts has ON DELETE CASCADE from proposals', () => {
    expect(sql(), 'proposal_vote_counts must cascade when proposal is deleted').toMatch(
      /REFERENCES proposals\(id\) ON DELETE CASCADE/,
    )
  })
})

// ---------------------------------------------------------------------------
// V11: HTTP smoke (requires PORTAL_URL)
// ---------------------------------------------------------------------------

describe('V11 — HTTP smoke (requires PORTAL_URL)', () => {
  it.skipIf(!hasPortal)('V11: badge page returns HTTP 200 after migration', async () => {
    const userId = 'user-test-001'
    const subject = 'climate'
    const res = await fetch(`${PORTAL_URL}/badge/${userId}/${subject}`)
    expect(res.status).toBe(200)
  })
})
