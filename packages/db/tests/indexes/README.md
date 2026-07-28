# Index tests

Verifies that every composite index from `migrations/040_composite_indexes.sql`
exists and causes the planner to choose index scans over seq scans.

## Prerequisites

- pgTAP installed in the database (`CREATE EXTENSION pgtap;`)
- `pg_prove` available locally (`cpan TAP::Parser::SourceHandler::pgTAP`)
- Migration 040 applied

## Run

```bash
# All three test files
pg_prove -d "$DATABASE_URL" tests/indexes/*.sql

# Or individually via psql
psql "$DATABASE_URL" -f tests/indexes/001_index_exists.sql
psql "$DATABASE_URL" -f tests/indexes/002_index_exists_mobile.sql
psql "$DATABASE_URL" -f tests/indexes/003_query_plans.sql
```

## Files

| File | Tests | What it checks |
|---|---|---|
| `001_index_exists.sql` | 14 | Web/shared indexes exist in pg_indexes |
| `002_index_exists_mobile.sql` | 2 | Mobile indexes exist (messages, users) |
| `003_query_plans.sql` | 18 | EXPLAIN output shows Index Scan, not Seq Scan |

## Note on plan tests

`003_query_plans.sql` uses a helper function that runs `EXPLAIN` (no ANALYZE)
and checks the output text. The planner must have table statistics for the
checks to be reliable — run `ANALYZE` on each table after seeding data if
the planner falls back to seq scans on an empty database.
