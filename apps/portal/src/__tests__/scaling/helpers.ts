// Shared test helpers for the scaling TDD suite

export function makeChain(data: unknown, count = 0) {
  const thenable = Promise.resolve({ data, count, error: null })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    is: () => chain,
    not: () => chain,
    limit: () => chain,
    order: () => chain,
    head: () => chain,
    delete: () => chain,
    then: thenable.then.bind(thenable),
    catch: thenable.catch.bind(thenable),
    single: () => Promise.resolve({ data, error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
  }
  return chain
}

// Standard DB fixture used across blocks A and B unit tests.
// Score = 2*10 + 5*5 + 3*2 + 1*8 + 1*3 + floor(100*0.1) = 20+25+6+8+3+10 = 72 (Silver)
export const DB_FIXTURE: Record<string, { data?: unknown; count?: number }> = {
  users:                { data: { display_name: 'Alice', avatar_url: null, location_name: 'London' } },
  communities:          { data: [{ id: 'c1' }] },
  accreditations:       { data: [{ weight: 2 }, { weight: 3 }] },
  votes:                { data: null, count: 3 },
  proposals:            { data: null, count: 1 },
  delegations:          { data: null, count: 2 },
  community_memberships:{ data: null, count: 1 },
  earnings:             { data: [{ amount: '100' }] },
}

export const EXPECTED_SCORE = 72
export const EXPECTED_TIER  = 'Silver'
export const USER_ID        = 'user-test-001'
export const SUBJECT        = 'climate'
