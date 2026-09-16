CREATE TABLE `participation` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`mode` text NOT NULL,
	`scores` text NOT NULL,
	`percentages` text NOT NULL,
	`submitted_by` text NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `participation_report` ON `participation` (`report_id`);--> statement-breakpoint
CREATE TABLE `representatives` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `representatives_group_email` ON `representatives` (`group_id`,`email`);