CREATE TABLE `ai_pilot_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`fixture_id` text NOT NULL,
	`goal` text NOT NULL,
	`state` text NOT NULL,
	`reserved_micros` integer NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`observed_micros` integer,
	`error_code` text,
	`created_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE TABLE `ai_pilot_budget` (
	`id` text PRIMARY KEY NOT NULL,
	`limit_micros` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`committed_micros` integer DEFAULT 0 NOT NULL,
	`observed_micros` integer DEFAULT 0 NOT NULL,
	`in_flight_id` text,
	`paused` integer DEFAULT 0 NOT NULL,
	`next_allowed_at` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
