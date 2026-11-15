-- Complaint subject and story, tip reference and details, public content.

-- AlterTable
ALTER TABLE "anonymous_reports" ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "product" TEXT,
ADD COLUMN     "reference_number" TEXT,
ADD COLUMN     "seen_on" TIMESTAMP(3),
ADD COLUMN     "subcity_code" TEXT,
ADD COLUMN     "woreda_code" TEXT;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "narrative" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "annual_tip_sequences" (
    "year" INTEGER NOT NULL,
    "last_val" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "annual_tip_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_items_kind_is_published_sort_order_idx" ON "content_items"("kind", "is_published", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_kind_slug_key" ON "content_items"("kind", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_reports_reference_number_key" ON "anonymous_reports"("reference_number");
