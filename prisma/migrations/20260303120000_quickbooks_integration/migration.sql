-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'synced';

-- AlterTable
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_line1" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_line2" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_city" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_state" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_postal" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "billing_country" TEXT DEFAULT 'US';

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('quickbooks');
CREATE TYPE "SyncJobStatus" AS ENUM ('pending', 'running', 'success', 'failed');
CREATE TYPE "ExternalEntityType" AS ENUM ('customer', 'invoice');

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "realm_id" TEXT NOT NULL,
    "company_name" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "access_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_references" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "entity_type" "ExternalEntityType" NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "step" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_provider_realm_id_key" ON "integration_connections"("provider", "realm_id");
CREATE UNIQUE INDEX "external_references_quote_id_provider_entity_type_key" ON "external_references"("quote_id", "provider", "entity_type");
CREATE UNIQUE INDEX "sync_jobs_idempotency_key_key" ON "sync_jobs"("idempotency_key");

-- AddForeignKey
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
