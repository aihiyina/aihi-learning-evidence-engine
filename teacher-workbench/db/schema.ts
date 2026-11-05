import {sqliteTable, text, integer, real} from 'drizzle-orm/sqlite-core';
export const aiTrialBudget=sqliteTable('ai_trial_budget',{id:text('id').primaryKey(),attempts:integer('attempts').notNull().default(0),updatedAt:text('updated_at').notNull()});
export const aiTrialAttempts=sqliteTable('ai_trial_attempts',{id:text('id').primaryKey(),fixtureId:text('fixture_id').notNull(),state:text('state').notNull(),inputTokens:integer('input_tokens'),outputTokens:integer('output_tokens'),estimatedCost:real('estimated_cost'),createdAt:text('created_at').notNull()});
export const aiPilotBudget=sqliteTable('ai_pilot_budget',{
  id:text('id').primaryKey(),limitMicros:integer('limit_micros').notNull(),attempts:integer('attempts').notNull().default(0),
  committedMicros:integer('committed_micros').notNull().default(0),observedMicros:integer('observed_micros').notNull().default(0),
  inFlightId:text('in_flight_id'),paused:integer('paused').notNull().default(0),nextAllowedAt:integer('next_allowed_at').notNull().default(0),updatedAt:text('updated_at').notNull()
});
export const aiPilotAttempts=sqliteTable('ai_pilot_attempts',{
  id:text('id').primaryKey(),campaignId:text('campaign_id').notNull(),fixtureId:text('fixture_id').notNull(),goal:text('goal').notNull(),
  state:text('state').notNull(),reservedMicros:integer('reserved_micros').notNull(),inputTokens:integer('input_tokens'),outputTokens:integer('output_tokens'),
  observedMicros:integer('observed_micros'),errorCode:text('error_code'),createdAt:text('created_at').notNull(),finishedAt:text('finished_at')
});
