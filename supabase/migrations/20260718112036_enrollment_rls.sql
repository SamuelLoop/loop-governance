-- Allow authenticated users to insert their own profile row
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Allow authenticated users to insert their own membership
CREATE POLICY "Users can join communities"
  ON community_memberships FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
