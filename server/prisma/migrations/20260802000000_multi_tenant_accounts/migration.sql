-- Multi-tenant migration: introduces "Account" (one per subscribing
-- company) and scopes all previously-global data to it. Written by hand
-- (not `prisma migrate dev`'s auto-diff) so existing data is preserved: a
-- single default Account is created and every pre-existing row is backfilled
-- to belong to it, since before this migration the whole app was implicitly
-- single-tenant.

-- CreateTable: Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_siteId_key" ON "Account"("siteId");

-- Backfill: one Account representing all pre-existing single-tenant data.
INSERT INTO "Account" ("id", "name", "siteId", "createdAt")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'My Company',
    '00000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP
);

-- Agent: add accountId + isSuperAdmin
ALTER TABLE "Agent" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Agent" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Agent" SET "accountId" = '00000000-0000-0000-0000-000000000001' WHERE "accountId" IS NULL;
ALTER TABLE "Agent" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Agent_accountId_idx" ON "Agent"("accountId");

-- Group: add accountId, unique(name) becomes unique(accountId, name)
ALTER TABLE "Group" ADD COLUMN "accountId" TEXT;
UPDATE "Group" SET "accountId" = '00000000-0000-0000-0000-000000000001' WHERE "accountId" IS NULL;
ALTER TABLE "Group" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Group" ADD CONSTRAINT "Group_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Group_name_key";
CREATE UNIQUE INDEX "Group_accountId_name_key" ON "Group"("accountId", "name");

-- Conversation: add accountId, replace global indexes with account-scoped ones
ALTER TABLE "Conversation" ADD COLUMN "accountId" TEXT;
UPDATE "Conversation" SET "accountId" = '00000000-0000-0000-0000-000000000001' WHERE "accountId" IS NULL;
ALTER TABLE "Conversation" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Conversation_visitorId_idx";
DROP INDEX IF EXISTS "Conversation_status_updatedAt_idx";
CREATE INDEX "Conversation_accountId_visitorId_idx" ON "Conversation"("accountId", "visitorId");
CREATE INDEX "Conversation_accountId_status_updatedAt_idx" ON "Conversation"("accountId", "status", "updatedAt");

-- CannedReply: add accountId, unique(shortcut) becomes unique(accountId, shortcut)
ALTER TABLE "CannedReply" ADD COLUMN "accountId" TEXT;
UPDATE "CannedReply" SET "accountId" = '00000000-0000-0000-0000-000000000001' WHERE "accountId" IS NULL;
ALTER TABLE "CannedReply" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "CannedReply" ADD CONSTRAINT "CannedReply_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "CannedReply_shortcut_key";
CREATE UNIQUE INDEX "CannedReply_accountId_shortcut_key" ON "CannedReply"("accountId", "shortcut");

-- Webhook: add accountId
ALTER TABLE "Webhook" ADD COLUMN "accountId" TEXT;
UPDATE "Webhook" SET "accountId" = '00000000-0000-0000-0000-000000000001' WHERE "accountId" IS NULL;
ALTER TABLE "Webhook" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Webhook_accountId_idx" ON "Webhook"("accountId");

-- WidgetSettings: was a single id="default" row, becomes keyed by accountId
ALTER TABLE "WidgetSettings" ADD COLUMN "accountId" TEXT;
UPDATE "WidgetSettings" SET "accountId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "WidgetSettings" DROP CONSTRAINT "WidgetSettings_pkey";
ALTER TABLE "WidgetSettings" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "WidgetSettings" ADD CONSTRAINT "WidgetSettings_pkey" PRIMARY KEY ("accountId");
ALTER TABLE "WidgetSettings" ADD CONSTRAINT "WidgetSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WidgetSettings" DROP COLUMN "id";

-- BillingSettings: same pattern as WidgetSettings
ALTER TABLE "BillingSettings" ADD COLUMN "accountId" TEXT;
UPDATE "BillingSettings" SET "accountId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "BillingSettings" DROP CONSTRAINT "BillingSettings_pkey";
ALTER TABLE "BillingSettings" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "BillingSettings" ADD CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("accountId");
ALTER TABLE "BillingSettings" ADD CONSTRAINT "BillingSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSettings" DROP COLUMN "id";
