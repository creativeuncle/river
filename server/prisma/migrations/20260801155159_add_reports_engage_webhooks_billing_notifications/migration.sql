-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "firstAgentReplyAt" TIMESTAMP(3),
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "ratingComment" TEXT;

-- AlterTable
ALTER TABLE "WidgetSettings" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyEmail" TEXT,
ADD COLUMN     "proactiveMessageDelaySeconds" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "proactiveMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proactiveMessageText" TEXT NOT NULL DEFAULT 'Need help? We''re here to chat!',
ADD COLUMN     "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "plan" TEXT NOT NULL DEFAULT 'Free',
    "seatLimit" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("id")
);
