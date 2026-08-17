CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_security_events_lookup` ON `security_events` (`event_type`,`fingerprint`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_security_events_created_at` ON `security_events` (`created_at`);