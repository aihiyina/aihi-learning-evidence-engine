CREATE TABLE `ai_trial_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`fixture_id` text NOT NULL,
	`state` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`estimated_cost` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_trial_budget` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
