CREATE TYPE "public"."item_priority" AS ENUM('normal', 'important', 'not_important');--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "priority" "item_priority" DEFAULT 'normal' NOT NULL;