-- Scope ExternalReference rows by connection so the same approved quote can be
-- synced to multiple QBO realms (one per demo-session visitor).

ALTER TABLE "external_references"
  ADD COLUMN "connection_id" UUID;

ALTER TABLE "external_references"
  ADD CONSTRAINT "external_references_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "integration_connections" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Replace the (quoteId, provider, entityType) uniqueness with a connection-aware one.
ALTER TABLE "external_references"
  DROP CONSTRAINT IF EXISTS "external_references_quote_id_provider_entity_type_key";

CREATE UNIQUE INDEX "external_references_quote_id_provider_entity_type_connection_id_key"
  ON "external_references" ("quote_id", "provider", "entity_type", "connection_id");

CREATE INDEX "external_references_quote_id_provider_entity_type_idx"
  ON "external_references" ("quote_id", "provider", "entity_type");
