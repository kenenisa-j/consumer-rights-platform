-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('CONSUMER', 'BUSINESS_OWNER', 'WOREDA_OFFICER', 'WOREDA_ADMIN', 'SUBCITY_COORDINATOR', 'BUREAU_OFFICER', 'BUREAU_ADMIN', 'CONTENT_ADMIN', 'SYSTEM_SUPERADMIN');

-- CreateEnum
CREATE TYPE "OfficeLevel" AS ENUM ('CITY_BUREAU', 'SUBCITY', 'WOREDA');

-- CreateEnum
CREATE TYPE "ComplaintRoute" AS ENUM ('DIRECT_GOVERNMENT', 'REGISTERED_BUSINESS');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('SUBMITTED_TO_BUSINESS', 'BUSINESS_OFFER_PENDING', 'ESCALATED_TO_GOVERNMENT', 'RECEIVED_BY_OFFICE', 'UNDER_INITIAL_REVIEW', 'OFFICER_ASSIGNED', 'INSPECTION_PENDING', 'INSPECTION_ACTIVE', 'INSPECTION_COMPLETED', 'CONCILIATION_SCHEDULED', 'SETTLEMENT_OFFERED', 'RESOLVED_MUTUALLY', 'RESOLVED_ADMINISTRATIVE_ORDER', 'COURT_REFERRAL_ISSUED', 'CLOSED_OUTSIDE_JURISDICTION', 'CLOSED_WITHDRAWN');

-- CreateEnum
CREATE TYPE "TransferDirection" AS ENUM ('UPWARD_ESCALATION', 'DOWNWARD_DISPATCH', 'LATERAL_REASSIGNMENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('CONSUMER_BUSINESS', 'CONSUMER_GOVERNMENT', 'BUSINESS_GOVERNMENT', 'GOVERNMENT_GOVERNMENT');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('CONSUMER', 'MERCHANT', 'GOVERNMENT_OFFICER', 'SUPERVISORY_OBSERVER');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'REPLACEMENT', 'REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "national_id_fayda" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "preferred_language" TEXT NOT NULL DEFAULT 'am',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'OWN',
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "administrative_offices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT NOT NULL,
    "level" "OfficeLevel" NOT NULL,
    "parent_office_id" TEXT,
    "subcity_code" TEXT,
    "woreda_code" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrative_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_offices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "office_id" TEXT NOT NULL,
    "role_in_office" TEXT NOT NULL DEFAULT 'OFFICER',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "user_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT NOT NULL,
    "subcity_code" TEXT NOT NULL,
    "woreda_office_id" TEXT NOT NULL,
    "location_description" TEXT NOT NULL,
    "gps_coordinates" TEXT,
    "total_stalls" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "business_category" TEXT NOT NULL,
    "market_id" TEXT,
    "stall_number" TEXT,
    "woreda_office_id" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "phone_number" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_users" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_in_business" TEXT NOT NULL DEFAULT 'OWNER',
    "is_primary_contact" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "merchant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT NOT NULL,
    "name_om" TEXT,
    "name_ti" TEXT,
    "name_so" TEXT,
    "default_sla_days" INTEGER NOT NULL DEFAULT 5,
    "default_remit_level" "OfficeLevel" NOT NULL DEFAULT 'WOREDA',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "route" "ComplaintRoute" NOT NULL,
    "complainant_id" TEXT NOT NULL,
    "complainant_alias" TEXT NOT NULL,
    "merchant_id" TEXT,
    "unregistered_merchant_name" TEXT,
    "unregistered_merchant_location" TEXT,
    "unregistered_merchant_phone" TEXT,
    "market_id" TEXT,
    "category_id" TEXT NOT NULL,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "item_description" TEXT NOT NULL,
    "disputed_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "payment_method" TEXT,
    "receipt_available" BOOLEAN NOT NULL DEFAULT true,
    "desired_remedy" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "current_office_id" TEXT,
    "escalated_to_gov_at" TIMESTAMP(3),
    "sla_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_assignments" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT NOT NULL,
    "office_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_transfers" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "from_office_id" TEXT NOT NULL,
    "to_office_id" TEXT NOT NULL,
    "direction" "TransferDirection" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "handover_note" TEXT NOT NULL,
    "initiated_by_user_id" TEXT NOT NULL,
    "responded_by_user_id" TEXT,
    "response_notes" TEXT,
    "transferred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "case_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_history" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "from_status" "CaseStatus",
    "to_status" "CaseStatus" NOT NULL,
    "handling_level" TEXT NOT NULL,
    "office_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "public_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_sla_pauses" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "pause_reason" TEXT NOT NULL,
    "paused_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumed_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "authorized_by_user_id" TEXT NOT NULL,

    CONSTRAINT "case_sla_pauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "case_id" TEXT,
    "office_id" TEXT NOT NULL,
    "lead_inspector_id" TEXT NOT NULL,
    "inspection_date" TIMESTAMP(3) NOT NULL,
    "location_name" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "action_taken" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_findings" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "nominal_value" DECIMAL(10,3),
    "measured_value" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "is_violation" BOOLEAN NOT NULL,
    "notes" TEXT,

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "kind" "ConversationKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_evidence_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_offers" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "offered_by_user_id" TEXT NOT NULL,
    "offer_type" "SettlementType" NOT NULL,
    "refund_amount" DECIMAL(12,2),
    "terms_description" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "uploader_user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "is_sanitized_copy" BOOLEAN NOT NULL DEFAULT false,
    "is_officer_only" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_reports" (
    "id" TEXT NOT NULL,
    "tracking_token_hash" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "market_id" TEXT,
    "market_location" TEXT NOT NULL,
    "target_business_name" TEXT,
    "description" TEXT NOT NULL,
    "destination_office_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "internal_notes" TEXT,
    "converted_case_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anonymous_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_report_audit_logs" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "action_code" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "internal_notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_report_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_audit_logs" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action_code" TEXT NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "case_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message_body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_referrals" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "referral_reference" TEXT NOT NULL,
    "target_court_or_authority" TEXT NOT NULL,
    "statutory_basis" TEXT NOT NULL,
    "summary_of_violations" TEXT NOT NULL,
    "restitution_sought" TEXT NOT NULL,
    "investigating_officer_id" TEXT NOT NULL,
    "approving_director_id" TEXT NOT NULL,
    "referral_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qr_verification_code" TEXT NOT NULL,

    CONSTRAINT "court_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_case_sequences" (
    "year" INTEGER NOT NULL,
    "last_val" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "annual_case_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_fayda_key" ON "users"("national_id_fayda");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "administrative_offices_code_key" ON "administrative_offices"("code");

-- CreateIndex
CREATE INDEX "administrative_offices_level_idx" ON "administrative_offices"("level");

-- CreateIndex
CREATE INDEX "administrative_offices_subcity_code_idx" ON "administrative_offices"("subcity_code");

-- CreateIndex
CREATE INDEX "administrative_offices_woreda_code_idx" ON "administrative_offices"("woreda_code");

-- CreateIndex
CREATE INDEX "user_offices_user_id_idx" ON "user_offices"("user_id");

-- CreateIndex
CREATE INDEX "user_offices_office_id_idx" ON "user_offices"("office_id");

-- CreateIndex
CREATE UNIQUE INDEX "markets_code_key" ON "markets"("code");

-- CreateIndex
CREATE INDEX "markets_woreda_office_id_idx" ON "markets"("woreda_office_id");

-- CreateIndex
CREATE INDEX "markets_subcity_code_idx" ON "markets"("subcity_code");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_registration_number_key" ON "merchants"("registration_number");

-- CreateIndex
CREATE INDEX "merchants_trade_name_idx" ON "merchants"("trade_name");

-- CreateIndex
CREATE INDEX "merchants_woreda_office_id_idx" ON "merchants"("woreda_office_id");

-- CreateIndex
CREATE INDEX "merchants_market_id_idx" ON "merchants"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_users_merchant_id_user_id_key" ON "merchant_users"("merchant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_categories_code_key" ON "complaint_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cases_reference_number_key" ON "cases"("reference_number");

-- CreateIndex
CREATE INDEX "cases_complainant_id_idx" ON "cases"("complainant_id");

-- CreateIndex
CREATE INDEX "cases_merchant_id_idx" ON "cases"("merchant_id");

-- CreateIndex
CREATE INDEX "cases_category_id_idx" ON "cases"("category_id");

-- CreateIndex
CREATE INDEX "cases_market_id_idx" ON "cases"("market_id");

-- CreateIndex
CREATE INDEX "cases_current_office_id_status_idx" ON "cases"("current_office_id", "status");

-- CreateIndex
CREATE INDEX "cases_route_idx" ON "cases"("route");

-- CreateIndex
CREATE INDEX "cases_sla_deadline_idx" ON "cases"("sla_deadline");

-- CreateIndex
CREATE INDEX "case_assignments_case_id_idx" ON "case_assignments"("case_id");

-- CreateIndex
CREATE INDEX "case_assignments_assigned_to_user_id_idx" ON "case_assignments"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "case_assignments_office_id_idx" ON "case_assignments"("office_id");

-- CreateIndex
CREATE INDEX "case_transfers_case_id_idx" ON "case_transfers"("case_id");

-- CreateIndex
CREATE INDEX "case_transfers_from_office_id_idx" ON "case_transfers"("from_office_id");

-- CreateIndex
CREATE INDEX "case_transfers_to_office_id_idx" ON "case_transfers"("to_office_id");

-- CreateIndex
CREATE INDEX "case_transfers_status_idx" ON "case_transfers"("status");

-- CreateIndex
CREATE INDEX "case_history_case_id_created_at_idx" ON "case_history"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "case_history_actor_user_id_idx" ON "case_history"("actor_user_id");

-- CreateIndex
CREATE INDEX "case_history_office_id_idx" ON "case_history"("office_id");

-- CreateIndex
CREATE INDEX "case_sla_pauses_case_id_idx" ON "case_sla_pauses"("case_id");

-- CreateIndex
CREATE INDEX "inspections_office_id_idx" ON "inspections"("office_id");

-- CreateIndex
CREATE INDEX "inspections_case_id_idx" ON "inspections"("case_id");

-- CreateIndex
CREATE INDEX "inspection_findings_inspection_id_idx" ON "inspection_findings"("inspection_id");

-- CreateIndex
CREATE INDEX "conversations_case_id_idx" ON "conversations"("case_id");

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE INDEX "messages_sender_user_id_idx" ON "messages"("sender_user_id");

-- CreateIndex
CREATE INDEX "settlement_offers_case_id_idx" ON "settlement_offers"("case_id");

-- CreateIndex
CREATE INDEX "settlement_offers_conversation_id_idx" ON "settlement_offers"("conversation_id");

-- CreateIndex
CREATE INDEX "evidence_files_case_id_idx" ON "evidence_files"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_reports_tracking_token_hash_key" ON "anonymous_reports"("tracking_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_reports_converted_case_id_key" ON "anonymous_reports"("converted_case_id");

-- CreateIndex
CREATE INDEX "anonymous_reports_tracking_token_hash_idx" ON "anonymous_reports"("tracking_token_hash");

-- CreateIndex
CREATE INDEX "anonymous_reports_destination_office_id_idx" ON "anonymous_reports"("destination_office_id");

-- CreateIndex
CREATE INDEX "anonymous_reports_status_idx" ON "anonymous_reports"("status");

-- CreateIndex
CREATE INDEX "anonymous_reports_market_id_idx" ON "anonymous_reports"("market_id");

-- CreateIndex
CREATE INDEX "anonymous_report_audit_logs_report_id_timestamp_idx" ON "anonymous_report_audit_logs"("report_id", "timestamp");

-- CreateIndex
CREATE INDEX "case_audit_logs_case_id_timestamp_idx" ON "case_audit_logs"("case_id", "timestamp");

-- CreateIndex
CREATE INDEX "case_audit_logs_actor_id_idx" ON "case_audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_read_idx" ON "notifications"("recipient_user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_case_id_idx" ON "notifications"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "court_referrals_case_id_key" ON "court_referrals"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "court_referrals_referral_reference_key" ON "court_referrals"("referral_reference");

-- CreateIndex
CREATE UNIQUE INDEX "court_referrals_qr_verification_code_key" ON "court_referrals"("qr_verification_code");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrative_offices" ADD CONSTRAINT "administrative_offices_parent_office_id_fkey" FOREIGN KEY ("parent_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_offices" ADD CONSTRAINT "user_offices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_offices" ADD CONSTRAINT "user_offices_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_woreda_office_id_fkey" FOREIGN KEY ("woreda_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_woreda_office_id_fkey" FOREIGN KEY ("woreda_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_users" ADD CONSTRAINT "merchant_users_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_users" ADD CONSTRAINT "merchant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_complainant_id_fkey" FOREIGN KEY ("complainant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "complaint_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_current_office_id_fkey" FOREIGN KEY ("current_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_transfers" ADD CONSTRAINT "case_transfers_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_transfers" ADD CONSTRAINT "case_transfers_from_office_id_fkey" FOREIGN KEY ("from_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_transfers" ADD CONSTRAINT "case_transfers_to_office_id_fkey" FOREIGN KEY ("to_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_transfers" ADD CONSTRAINT "case_transfers_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_transfers" ADD CONSTRAINT "case_transfers_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_history" ADD CONSTRAINT "case_history_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sla_pauses" ADD CONSTRAINT "case_sla_pauses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sla_pauses" ADD CONSTRAINT "case_sla_pauses_authorized_by_user_id_fkey" FOREIGN KEY ("authorized_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_lead_inspector_id_fkey" FOREIGN KEY ("lead_inspector_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_attachment_evidence_id_fkey" FOREIGN KEY ("attachment_evidence_id") REFERENCES "evidence_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_offers" ADD CONSTRAINT "settlement_offers_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_offers" ADD CONSTRAINT "settlement_offers_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_offers" ADD CONSTRAINT "settlement_offers_offered_by_user_id_fkey" FOREIGN KEY ("offered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_reports" ADD CONSTRAINT "anonymous_reports_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_reports" ADD CONSTRAINT "anonymous_reports_destination_office_id_fkey" FOREIGN KEY ("destination_office_id") REFERENCES "administrative_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_reports" ADD CONSTRAINT "anonymous_reports_converted_case_id_fkey" FOREIGN KEY ("converted_case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_report_audit_logs" ADD CONSTRAINT "anonymous_report_audit_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "anonymous_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_audit_logs" ADD CONSTRAINT "case_audit_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_audit_logs" ADD CONSTRAINT "case_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_referrals" ADD CONSTRAINT "court_referrals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_referrals" ADD CONSTRAINT "court_referrals_investigating_officer_id_fkey" FOREIGN KEY ("investigating_officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_referrals" ADD CONSTRAINT "court_referrals_approving_director_id_fkey" FOREIGN KEY ("approving_director_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==============================================================================
-- Custom Database Constraints, Indexes, and Reference Trigger
-- Source of Truth: docs/database-design.md (Section 6)
-- ==============================================================================

-- 1. Dual-Routing Validity CHECK Constraint
ALTER TABLE "cases" ADD CONSTRAINT "chk_case_dual_routing" CHECK (
  -- Route A: Direct to Government
  -- Requires current_office_id; escalated_to_gov_at must remain NULL.
  -- Registered merchant identification and unregistered merchant details are mutually exclusive.
  -- If any unregistered merchant detail is supplied, unregistered_merchant_name must be present.
  (route = 'DIRECT_GOVERNMENT'
   AND current_office_id IS NOT NULL
   AND escalated_to_gov_at IS NULL
   AND NOT (
     merchant_id IS NOT NULL
     AND (
       unregistered_merchant_name IS NOT NULL
       OR unregistered_merchant_location IS NOT NULL
       OR unregistered_merchant_phone IS NOT NULL
     )
   )
   AND (
     (unregistered_merchant_location IS NULL AND unregistered_merchant_phone IS NULL)
     OR unregistered_merchant_name IS NOT NULL
   ))
  OR
  -- Route B: Registered Business
  -- Requires registered merchant; all unregistered merchant fields must be NULL.
  -- Pre-escalation: office NULL, escalated_to_gov_at NULL.
  -- Post-escalation: both office and escalated_to_gov_at populated.
  (route = 'REGISTERED_BUSINESS'
   AND merchant_id IS NOT NULL
   AND unregistered_merchant_name IS NULL
   AND unregistered_merchant_location IS NULL
   AND unregistered_merchant_phone IS NULL
   AND (
     (escalated_to_gov_at IS NULL AND current_office_id IS NULL)
     OR
     (escalated_to_gov_at IS NOT NULL AND current_office_id IS NOT NULL)
   ))
);

-- 2. Partial Unique Indexes

-- (a) At most one active office deployment per user
CREATE UNIQUE INDEX "idx_user_single_active_office"
ON "user_offices" ("user_id")
WHERE "is_active" = TRUE;

-- (b) At most one active assigned officer per case
CREATE UNIQUE INDEX "idx_case_single_active_assignment"
ON "case_assignments" ("case_id")
WHERE "is_active" = TRUE;

-- (c) At most one pending transfer request per case
CREATE UNIQUE INDEX "idx_case_single_pending_transfer"
ON "case_transfers" ("case_id")
WHERE "status" = 'PENDING_ACCEPTANCE';

-- (d) At most one bilateral merchant-consumer negotiation conversation per case
CREATE UNIQUE INDEX "idx_case_single_merchant_negotiation"
ON "conversations" ("case_id")
WHERE "kind" = 'CONSUMER_BUSINESS';

-- 3. Atomic Annual Reference Sequence Trigger (CC-YYYY-NNNNN)

CREATE OR REPLACE FUNCTION generate_case_reference()
RETURNS TRIGGER AS $$
DECLARE
  v_year INT;
  v_seq INT;
BEGIN
  -- 1. Determine calendar year in local Addis Ababa time (Africa/Addis_Ababa, UTC+3)
  v_year := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Africa/Addis_Ababa'));

  -- 2. Atomic increment with row-level locking per calendar year
  INSERT INTO "annual_case_sequences" ("year", "last_val")
  VALUES (v_year, 1)
  ON CONFLICT ("year") DO UPDATE
    SET "last_val" = "annual_case_sequences"."last_val" + 1
  RETURNING "last_val" INTO v_seq;

  -- 3. Enforce 5-digit sequence ceiling (CC-YYYY-99999)
  IF v_seq > 99999 THEN
    RAISE EXCEPTION 'Annual case sequence counter overflow for year %: %', v_year, v_seq;
  END IF;

  -- 4. Format reference: CC-YYYY-NNNNN
  NEW."reference_number" := 'CC-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_generate_case_reference
BEFORE INSERT ON "cases"
FOR EACH ROW
WHEN (NEW."reference_number" IS NULL OR NEW."reference_number" = '')
EXECUTE FUNCTION generate_case_reference();
