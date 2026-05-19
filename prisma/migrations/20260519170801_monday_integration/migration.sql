-- Monday.com integration: a second IntegrationProvider, board_item entity type
-- for the per-order Monday item ref, and a defaultBoardId on the connection.

ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'monday';
ALTER TYPE "ExternalEntityType" ADD VALUE IF NOT EXISTS 'board_item';

ALTER TABLE "integration_connections"
  ADD COLUMN "default_board_id" TEXT;
