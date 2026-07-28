/**
 * Connection pooling (scale-04)
 *
 * P1-P2, P5-P6, P9-P10: Source-file assertions. Pass without a live DB.
 * P3, P4, P7:            Integration. Skipped unless SUPABASE_DB_POOLER_URL is set.
 * P8:                    Source-file assertion for connect_timeout config.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(process.cwd(), '../..')

const PORTAL_DB_TS = path.resolve(process.cwd(), 'src/lib/db.ts')
const CONSOLE_DB_TS = path.resolve(ROOT, 'apps/console/src/lib/db.ts')
const POWER_TS = path.resolve(process.cwd(), 'src/app/badge/[userId]/[subject]/power.ts')
const SUPABASE_SERVER_TS = path.resolve(process.cwd(), 'src/lib/supabase-server.ts')

const hasPooler = !!process.env.SUPABASE_DB_POOLER_URL

// ---------------------------------------------------------------------------
// P1 — getDb() singleton (source-file assertion)
// ---------------------------------------------------------------------------

describe('P1 — getDb() singleton', () => {
  it('P1a: db.ts exports a getDb function', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must export getDb').toMatch(/export function getDb/)
  })

  it('P1b: db.ts uses a module-level variable for singleton', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must have a module-level _sql variable').toMatch(/let _sql/)
    expect(src, 'must guard with if (!_sql)').toMatch(/if \(!_sql\)/)
  })

  it.skipIf(!hasPooler)('P1c: getDb() returns same instance across calls', async () => {
    // Reset module cache to get a clean singleton
    const { getDb } = await import('@/lib/db')
    const a = getDb()
    const b = getDb()
    expect(a, 'getDb() must return the same instance (singleton)').toBe(b)
  })
})

// ---------------------------------------------------------------------------
// P2 — getDb() uses SUPABASE_DB_POOLER_URL (source-file assertion)
// ---------------------------------------------------------------------------

describe('P2 — pooler env var usage', () => {
  it('P2a: db.ts reads from SUPABASE_DB_POOLER_URL', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must reference SUPABASE_DB_POOLER_URL').toMatch(
      /SUPABASE_DB_POOLER_URL/,
    )
  })

  it('P2b: db.ts does not use SUPABASE_URL (the REST/PostgREST URL)', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must not reference SUPABASE_URL directly').not.toMatch(
      /['"`]SUPABASE_URL['"`]/,
    )
  })

  it('P2c: db.ts does not hardcode port 5432', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must not reference port 5432').not.toMatch(/:5432/)
  })
})

// ---------------------------------------------------------------------------
// P3 — pooler client executes a simple read query (integration)
// ---------------------------------------------------------------------------

describe('P3 — pooler read query', () => {
  it.skipIf(!hasPooler)('P3: SELECT 1 AS ping returns 1', async () => {
    const { getDb } = await import('@/lib/db')
    const sql = getDb()
    const rows = await sql`SELECT 1 AS ping`
    expect(rows[0]?.ping, 'ping must equal 1').toBe(1)
    await sql.end()
  })
})

// ---------------------------------------------------------------------------
// P4 — max connections per instance (source + integration)
// ---------------------------------------------------------------------------

describe('P4 — max connections config', () => {
  it('P4a: db.ts configures max: 5 connections per lambda instance', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must set max: 5').toMatch(/max\s*:\s*5/)
  })

  it.skipIf(!hasPooler)('P4b: 20 concurrent queries complete without exhausting pool', async () => {
    const { getDb } = await import('@/lib/db')
    const sql = getDb()
    const results = await Promise.all(
      Array.from({ length: 20 }, () => sql`SELECT 1 AS ok`),
    )
    expect(results.length, 'all 20 queries must complete').toBe(20)
    results.forEach((rows, i) => {
      expect(rows[0]?.ok, `query ${i} must return 1`).toBe(1)
    })
    await sql.end()
  })
})

// ---------------------------------------------------------------------------
// P5 — no :5432 references in hot-path app code (source-file grep)
// ---------------------------------------------------------------------------

describe('P5 — no direct Postgres port in app code', () => {
  it('P5a: power.ts does not reference port 5432', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    expect(src, 'power.ts must not reference :5432').not.toMatch(/:5432/)
  })

  it('P5b: supabase-server.ts does not reference port 5432', () => {
    const src = fs.readFileSync(SUPABASE_SERVER_TS, 'utf-8')
    expect(src, 'supabase-server.ts must not reference :5432').not.toMatch(/:5432/)
  })
})

// ---------------------------------------------------------------------------
// P6 — auth still uses Supabase client, not raw postgres (source assertion)
// ---------------------------------------------------------------------------

describe('P6 — auth uses Supabase client', () => {
  it('P6a: supabase-server.ts exports createClient() for auth', () => {
    const src = fs.readFileSync(SUPABASE_SERVER_TS, 'utf-8')
    expect(src, 'must export createClient').toMatch(/export.*function createClient/)
  })

  it('P6b: supabase-server.ts does not import from postgres package', () => {
    const src = fs.readFileSync(SUPABASE_SERVER_TS, 'utf-8')
    expect(src, 'auth module must not use raw postgres').not.toMatch(
      /from ['"]postgres['"]/,
    )
  })

  it('P6c: power.ts uses createServiceClient for Supabase operations', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    expect(src, 'power.ts must still use createServiceClient').toMatch(
      /createServiceClient/,
    )
  })
})

// ---------------------------------------------------------------------------
// P7 — 50 concurrent badge page loads via pooler (integration)
// ---------------------------------------------------------------------------

describe('P7 — 50 concurrent pooler reads', () => {
  it.skipIf(!hasPooler)('P7: 50 concurrent queries complete without connection errors', async () => {
    const { getDb } = await import('@/lib/db')
    const sql = getDb()
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        sql`SELECT ${i}::int AS idx`,
      ),
    )
    expect(results.length, 'all 50 queries must complete').toBe(50)
    results.forEach((rows, i) => {
      expect(rows[0]?.idx, `query ${i} must return correct index`).toBe(i)
    })
    await sql.end()
  })
})

// ---------------------------------------------------------------------------
// P8 — connect_timeout is configured (source assertion)
// ---------------------------------------------------------------------------

describe('P8 — connection failure handling', () => {
  it('P8a: db.ts sets connect_timeout so failed connections do not hang', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must configure connect_timeout').toMatch(/connect_timeout\s*:\s*10/)
  })

  it('P8b: db.ts sets idle_timeout to release unused connections', () => {
    const src = fs.readFileSync(PORTAL_DB_TS, 'utf-8')
    expect(src, 'must configure idle_timeout').toMatch(/idle_timeout\s*:\s*\d+/)
  })
})

// ---------------------------------------------------------------------------
// P9 — power.ts handles DB unreachable gracefully (source assertion)
// ---------------------------------------------------------------------------

describe('P9 — graceful DB failure in power.ts', () => {
  it('P9a: getPowerStats is wrapped to handle errors gracefully', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    // The function must have error boundary — try/catch or explicit null return
    const hasTryCatch = /try\s*\{/.test(src)
    const hasNullReturn = /return null/.test(src)
    expect(
      hasTryCatch || hasNullReturn,
      'getPowerStats must handle failures (try/catch or null return)',
    ).toBe(true)
  })

  it('P9b: power.ts imports getDb from @/lib/db', () => {
    const src = fs.readFileSync(POWER_TS, 'utf-8')
    expect(src, 'power.ts must import getDb from pooler module').toMatch(
      /from ['"]@\/lib\/db['"]/,
    )
  })
})

// ---------------------------------------------------------------------------
// P10 — console db.ts exists and uses pooler (source assertion)
// ---------------------------------------------------------------------------

describe('P10 — console app has pooler client', () => {
  it('P10a: apps/console/src/lib/db.ts exists', () => {
    expect(
      fs.existsSync(CONSOLE_DB_TS),
      'console db.ts must exist',
    ).toBe(true)
  })

  it('P10b: console db.ts uses SUPABASE_DB_POOLER_URL', () => {
    const src = fs.readFileSync(CONSOLE_DB_TS, 'utf-8')
    expect(src, 'console db.ts must reference SUPABASE_DB_POOLER_URL').toMatch(
      /SUPABASE_DB_POOLER_URL/,
    )
  })

  it('P10c: console db.ts exports getDb()', () => {
    const src = fs.readFileSync(CONSOLE_DB_TS, 'utf-8')
    expect(src, 'console db.ts must export getDb').toMatch(/export function getDb/)
  })
})
