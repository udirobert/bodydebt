CREATE TYPE "public"."care_adherence" AS ENUM('taken_as_prescribed', 'missed_one_dose', 'missed_multiple', 'stopped', 'not_started');--> statement-breakpoint
CREATE TYPE "public"."care_escalation_status" AS ENUM('open', 'resolved', 'clinic_reviewed');--> statement-breakpoint
CREATE TYPE "public"."care_intervention_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."care_severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."care_symptom" AS ENUM('nausea', 'vomiting', 'diarrhoea', 'constipation', 'abdominal_pain', 'reflux', 'headache', 'fatigue', 'dizziness', 'hypoglycaemia_symptoms', 'injection_site_reaction', 'fever', 'jaundice', 'allergic_reaction', 'none');--> statement-breakpoint
CREATE TABLE "care_escalations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"observation_id" varchar(128),
	"reason" text NOT NULL,
	"status" "care_escalation_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "care_interventions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"observation_id" varchar(128),
	"action" text NOT NULL,
	"status" "care_intervention_status" DEFAULT 'pending' NOT NULL,
	"due_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "care_observations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"patient_id" varchar(128) NOT NULL,
	"check_in_at" timestamp DEFAULT now() NOT NULL,
	"symptoms" "care_symptom"[] NOT NULL,
	"symptom_severity" "care_severity" NOT NULL,
	"adherence" "care_adherence" NOT NULL,
	"weight_kg" integer,
	"fasting_glucose" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "care_patients" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"clinic_id" varchar(128),
	"medication" text,
	"current_dose_mg" integer,
	"started_at" timestamp,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
