ALTER TABLE "users" ADD COLUMN "identity_user_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_identity_user_id_idx" ON "users" USING btree ("identity_user_id");
