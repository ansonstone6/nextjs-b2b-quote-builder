-- The original quickbooks_integration migration created a unique INDEX on
-- (provider, realm_id), not a unique CONSTRAINT. The later
-- add_demo_session_to_integration migration tried to drop it with
-- `ALTER TABLE ... DROP CONSTRAINT IF EXISTS`, which is a no-op for indexes,
-- so the legacy 2-column unique has been silently surviving. That blocks the
-- expected per-session multi-tenancy: the same provider+realm should be
-- connectable from two different demo sessions (and saveMondayConnection
-- relies on that when a visitor reconnects from a fresh cookie).
--
-- Drop it properly here. The intended uniqueness (provider, realm_id,
-- demo_session_id) is already in place from migration 20260518123730.

DROP INDEX IF EXISTS "integration_connections_provider_realm_id_key";
