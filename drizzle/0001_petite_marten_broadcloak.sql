CREATE TABLE "wish_item_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_list_id" varchar(255) NOT NULL,
	"external_list_name" varchar(255),
	"member_id" uuid NOT NULL,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wish_items" ADD COLUMN "wish_item_source_id" uuid;--> statement-breakpoint
ALTER TABLE "wish_items" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "wish_items" ADD COLUMN "external_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "wish_item_sources" ADD CONSTRAINT "wish_item_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_item_sources" ADD CONSTRAINT "wish_item_sources_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wish_item_sources_user_provider_idx" ON "wish_item_sources" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "wish_item_sources_member_idx" ON "wish_item_sources" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_wish_item_source_id_wish_item_sources_id_fk" FOREIGN KEY ("wish_item_source_id") REFERENCES "public"."wish_item_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wish_items_source_idx" ON "wish_items" USING btree ("wish_item_source_id");--> statement-breakpoint
CREATE INDEX "wish_items_external_id_idx" ON "wish_items" USING btree ("external_id");