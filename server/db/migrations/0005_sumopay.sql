ALTER TABLE "singapay_webhook_events" RENAME TO "sumopay_webhook_events";--> statement-breakpoint
ALTER TABLE "sumopay_webhook_events" RENAME CONSTRAINT "singapay_webhook_events_pkey" TO "sumopay_webhook_events_pkey";--> statement-breakpoint
ALTER TABLE "sumopay_webhook_events" RENAME CONSTRAINT "singapay_webhook_events_event_id_unique" TO "sumopay_webhook_events_event_id_unique";--> statement-breakpoint
ALTER TYPE "public"."transaction_method" RENAME VALUE 'singapay' TO 'sumopay';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_expires_at" timestamp with time zone;
