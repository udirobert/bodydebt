CREATE TABLE "care_acknowledgements" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"clinic_id" varchar(128) NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"invitation_id" varchar(128),
	"policy_version" varchar(64) NOT NULL,
	"acknowledged_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "care_invitations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"clinic_id" varchar(128) NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "care_invitations_token_hash_unique" UNIQUE("token_hash")
);
