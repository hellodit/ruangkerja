CREATE TYPE "public"."action_plan_status" AS ENUM('belum_dimulai', 'berjalan', 'selesai');--> statement-breakpoint
CREATE TYPE "public"."ai_target_type" AS ENUM('progress_description', 'realization');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('pns', 'pppk');--> statement-breakpoint
CREATE TYPE "public"."evaluation_frequency" AS ENUM('monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('perempuan', 'laki_laki');--> statement-breakpoint
CREATE TYPE "public"."indicator_aspect" AS ENUM('kuantitas', 'kualitas', 'waktu', 'biaya');--> statement-breakpoint
CREATE TYPE "public"."input_method" AS ENUM('typed', 'voice');--> statement-breakpoint
CREATE TYPE "public"."progress_category" AS ENUM('biasa', 'perlu_diskusi');--> statement-breakpoint
CREATE TYPE "public"."progress_view" AS ENUM('list', 'calendar');--> statement-breakpoint
CREATE TYPE "public"."realization_status" AS ENUM('draf', 'disalin');--> statement-breakpoint
CREATE TYPE "public"."rhk_type" AS ENUM('utama', 'tambahan');--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('avatar');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rhk_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target" numeric(12, 2) NOT NULL,
	"unit" text NOT NULL,
	"due_date" date NOT NULL,
	"status" "action_plan_status" DEFAULT 'belum_dimulai' NOT NULL,
	"completed_at" timestamp with time zone,
	"copied_from_id" uuid,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "ai_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"model" text NOT NULL,
	"accepted" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_plan_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"description" text NOT NULL,
	"description_raw" text,
	"input_method" "input_method" DEFAULT 'typed' NOT NULL,
	"realization" numeric(12, 2) DEFAULT 0 NOT NULL,
	"category" "progress_category" DEFAULT 'biasa' NOT NULL,
	"marks_plan_complete" boolean DEFAULT false NOT NULL,
	"copied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "daily_progress_time_ck" CHECK ("daily_progress"."end_time" > "daily_progress"."start_time")
);
--> statement-breakpoint
CREATE TABLE "evaluation_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skp_id" uuid NOT NULL,
	"sequence" smallint NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"submission_deadline" date NOT NULL,
	CONSTRAINT "evaluation_periods_skp_seq_uq" UNIQUE("skp_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "pending_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_uploads_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "period_realizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rhk_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"draft_text" text NOT NULL,
	"final_text" text,
	"status" realization_status DEFAULT 'draf' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"copied_at" timestamp with time zone,
	CONSTRAINT "period_realizations_rhk_period_uq" UNIQUE("rhk_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone_whatsapp" text,
	"birth_date" text,
	"gender" "gender",
	"address" text,
	"nip" text,
	"employment_status" "employment_status",
	"rank_grade" text,
	"position_title" text,
	"work_unit" text,
	"agency" text,
	"supervisor_name" text,
	"supervisor_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"progress_id" uuid NOT NULL,
	"name" text NOT NULL,
	"evidence_url" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "realization_sources" (
	"realization_id" uuid NOT NULL,
	"progress_id" uuid NOT NULL,
	CONSTRAINT "realization_sources_realization_id_progress_id_pk" PRIMARY KEY("realization_id","progress_id")
);
--> statement-breakpoint
CREATE TABLE "rhk_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rhk_id" uuid NOT NULL,
	"aspect" "indicator_aspect" NOT NULL,
	"indicator" text NOT NULL,
	"target" numeric(12, 2) NOT NULL,
	"unit" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rhks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skp_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"type" "rhk_type" DEFAULT 'utama' NOT NULL,
	"statement" text NOT NULL,
	"supervisor_rhk" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "singapay_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "singapay_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "skps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"evaluation_frequency" "evaluation_frequency" DEFAULT 'monthly' NOT NULL,
	"submission_deadline_day" smallint DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skps_user_year_uq" UNIQUE("user_id","year"),
	CONSTRAINT "skps_deadline_day_ck" CHECK ("skps"."submission_deadline_day" between 1 and 28)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"remind_before_deadline" boolean DEFAULT true NOT NULL,
	"remind_days_before" smallint DEFAULT 3 NOT NULL,
	"remind_daily" boolean DEFAULT true NOT NULL,
	"remind_daily_time" time DEFAULT '16:00' NOT NULL,
	"progress_view" "progress_view" DEFAULT 'list' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_rhk_id_rhks_id_fk" FOREIGN KEY ("rhk_id") REFERENCES "public"."rhks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_copied_from_id_action_plans_id_fk" FOREIGN KEY ("copied_from_id") REFERENCES "public"."action_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_action_plan_id_action_plans_id_fk" FOREIGN KEY ("action_plan_id") REFERENCES "public"."action_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "evaluation_periods_skp_id_skps_id_fk" FOREIGN KEY ("skp_id") REFERENCES "public"."skps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_realizations" ADD CONSTRAINT "period_realizations_rhk_id_rhks_id_fk" FOREIGN KEY ("rhk_id") REFERENCES "public"."rhks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_realizations" ADD CONSTRAINT "period_realizations_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_results" ADD CONSTRAINT "progress_results_progress_id_daily_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."daily_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realization_sources" ADD CONSTRAINT "realization_sources_realization_id_period_realizations_id_fk" FOREIGN KEY ("realization_id") REFERENCES "public"."period_realizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realization_sources" ADD CONSTRAINT "realization_sources_progress_id_daily_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."daily_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rhk_indicators" ADD CONSTRAINT "rhk_indicators_rhk_id_rhks_id_fk" FOREIGN KEY ("rhk_id") REFERENCES "public"."rhks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rhks" ADD CONSTRAINT "rhks_skp_id_skps_id_fk" FOREIGN KEY ("skp_id") REFERENCES "public"."skps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skps" ADD CONSTRAINT "skps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "action_plans_period_rhk_idx" ON "action_plans" USING btree ("period_id","rhk_id");--> statement-breakpoint
CREATE INDEX "daily_progress_user_date_idx" ON "daily_progress" USING btree ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "daily_progress_plan_idx" ON "daily_progress" USING btree ("action_plan_id");--> statement-breakpoint
CREATE INDEX "evaluation_periods_skp_start_idx" ON "evaluation_periods" USING btree ("skp_id","start_date");--> statement-breakpoint
CREATE INDEX "pending_uploads_user_idx" ON "pending_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "progress_results_progress_idx" ON "progress_results" USING btree ("progress_id");--> statement-breakpoint
CREATE INDEX "rhk_indicators_rhk_idx" ON "rhk_indicators" USING btree ("rhk_id");--> statement-breakpoint
CREATE INDEX "rhks_skp_idx" ON "rhks" USING btree ("skp_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");