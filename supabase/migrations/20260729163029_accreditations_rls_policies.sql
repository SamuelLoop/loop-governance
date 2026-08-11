-- accreditations has had ROW LEVEL SECURITY enabled since 001_initial.sql
-- but never got any policies, unlike its sibling table `delegations` which
-- got matching select/insert/update "true" policies in 004_delegations.sql.
-- With RLS on and zero policies, every insert/select/update from a non-owner
-- role (i.e. any real user via the anon key) is default-denied — this is
-- what threw "new row violates row-level security policy for table
-- accreditations" from the mobile app's Accredit action.
--
-- Mirror delegations' openness level exactly: this is a governance app
-- where correctness is enforced by unique constraints and application
-- logic, not by restricting who can insert their own accreditation.

BEGIN;

CREATE POLICY accreditations_select ON accreditations FOR SELECT USING (true);
CREATE POLICY accreditations_insert ON accreditations FOR INSERT WITH CHECK (true);
CREATE POLICY accreditations_update ON accreditations FOR UPDATE USING (true);

COMMIT;
