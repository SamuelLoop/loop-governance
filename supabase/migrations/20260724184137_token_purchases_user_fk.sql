-- token_purchases.user_id has always FK-referenced auth.users(id), but
-- every code path (checkout route reads profile.id, /claim queries by
-- profile.id) uses the Loop users(id). Real logged-in purchases would
-- have failed the FK - the table just hasn't seen one yet.
--
-- Point the FK at users(id) so the schema matches usage. Also update
-- the RLS policy that assumed auth.uid() == user_id.

BEGIN;

ALTER TABLE token_purchases DROP CONSTRAINT IF EXISTS token_purchases_user_id_fkey;

ALTER TABLE token_purchases
  ADD CONSTRAINT token_purchases_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can view own purchases" ON token_purchases;
CREATE POLICY "Users can view own purchases" ON token_purchases
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

COMMIT;
