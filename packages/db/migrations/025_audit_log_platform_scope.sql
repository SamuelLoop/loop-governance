-- Allow platform-scope audit entries (no white-label context).
-- platform_admin changes to platform defaults and other global actions
-- do not belong to any single organization.

ALTER TABLE admin_audit_log ALTER COLUMN white_label_id DROP NOT NULL;
