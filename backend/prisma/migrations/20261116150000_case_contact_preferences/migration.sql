-- How the consumer wants to be reached about a complaint: email, language and update channels.

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "notify_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_sms" BOOLEAN NOT NULL DEFAULT false;
