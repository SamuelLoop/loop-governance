-- Retire the loyalty_config table. Loyalty settings now live in the
-- governance_settings cascade (see migration 029). Any historical rows
-- were migrated during 029; nothing at runtime reads this table anymore.

BEGIN;

DROP TABLE IF EXISTS loyalty_config CASCADE;

COMMIT;
