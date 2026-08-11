-- Platform-level admin role: bypasses community membership checks for treasury ops
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'member'
  CHECK (platform_role IN ('member', 'platform_admin'));

-- Set initial platform admin
UPDATE users SET platform_role = 'platform_admin'
  WHERE id = '02c63176-10c3-4211-846f-1b363c5f3307';
