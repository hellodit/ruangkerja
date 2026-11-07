ALTER TYPE "public"."transaction_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_code_unique" UNIQUE("code");