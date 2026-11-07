CREATE INDEX "action_plans_rhk_idx" ON "action_plans" USING btree ("rhk_id");--> statement-breakpoint
CREATE INDEX "action_plans_copied_from_idx" ON "action_plans" USING btree ("copied_from_id") WHERE "action_plans"."copied_from_id" is not null;--> statement-breakpoint
CREATE INDEX "ai_suggestions_user_idx" ON "ai_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "period_realizations_period_idx" ON "period_realizations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "realization_sources_progress_idx" ON "realization_sources" USING btree ("progress_id");--> statement-breakpoint
CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "transactions_package_idx" ON "transactions" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "transactions_created_by_idx" ON "transactions" USING btree ("created_by") WHERE "transactions"."created_by" is not null;--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");