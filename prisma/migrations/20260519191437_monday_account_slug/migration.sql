-- Monday URLs require the account subdomain (e.g. https://acme.monday.com/boards/...).
-- Persist the slug at connect time so we can build canonical item URLs that don't 404.

ALTER TABLE "integration_connections"
  ADD COLUMN "account_slug" TEXT;
