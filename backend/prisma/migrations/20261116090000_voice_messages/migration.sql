-- Voice notes in conversations: the kind of message and the recording itself.

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "audio" BYTEA,
ADD COLUMN     "audio_mime" TEXT,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'TEXT';
