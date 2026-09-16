CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`file_id` text,
	`scores` text NOT NULL,
	`percent` real NOT NULL,
	`notes` text NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_assignment` ON `assessments` (`assignment_id`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`stage` text NOT NULL,
	`evaluator_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluator_id`) REFERENCES `evaluators`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignments_panel` ON `assignments` (`group_id`,`stage`,`evaluator_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`year` integer NOT NULL,
	`created_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluators` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluators_class_email` ON `evaluators` (`class_id`,`email`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`start_week` text NOT NULL,
	`created_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_class_name` ON `groups` (`class_id`,`name`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`week_id` text NOT NULL,
	`group_id` text NOT NULL,
	`past` text NOT NULL,
	`plan` text NOT NULL,
	`delivery` text NOT NULL,
	`submitted_at` text,
	`imported_at` text,
	`updated_at` text NOT NULL,
	`plan_checked_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`percent` real,
	`justification` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`evidence` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_week_group` ON `reports` (`week_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `rubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`total` real NOT NULL,
	`config` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rubrics_class` ON `rubrics` (`class_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`group_id` text,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`student_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`percent` real,
	`justification` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`evidence` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_report` ON `tasks` (`report_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_report_student` ON `tasks` (`report_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`start` text NOT NULL,
	`due_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weeks_class_start` ON `weeks` (`class_id`,`start`);