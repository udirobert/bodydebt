CREATE TABLE "care_audit_logs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"clinic_id" varchar(128) NOT NULL,
	"actor_user_id" varchar(128) NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" varchar(128) NOT NULL,
	"action_type" varchar(64) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_interventions" ADD COLUMN "outcome_code" varchar(32);--> statement-breakpoint
ALTER TABLE "care_interventions" ADD COLUMN "outcome_note" text;