-- Scope QuickBooks connections by browser-side demo session id.
-- Nullable so existing local-dev rows stay valid; in production this would become user_id.

ALTER TABLE "integration_connections"
  ADD COLUMN "demo_session_id" TEXT;

-- Drop the old uniqueness on (provider, realm_id) so the same realm can be connected
-- from two different demo sessions (uncommon but valid for a public sandbox demo).
ALTER TABLE "integration_connections"
  DROP CONSTRAINT IF EXISTS "integration_connections_provider_realm_id_key";

-- New uniqueness: a given (provider, realm) can appear at most once per session
-- (or once globally for the legacy null-session local-dev case).
CREATE UNIQUE INDEX "integration_connections_provider_realm_id_demo_session_id_key"
  ON "integration_connections" ("provider", "realm_id", "demo_session_id");

CREATE INDEX "integration_connections_provider_demo_session_id_idx"
  ON "integration_connections" ("provider", "demo_session_id");
