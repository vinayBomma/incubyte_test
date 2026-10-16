CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`job_title` text NOT NULL,
	`department` text NOT NULL,
	`country` text NOT NULL,
	`salary` integer NOT NULL,
	`currency` text NOT NULL,
	`hired_on` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_employee_country` ON `employees` (`country`);--> statement-breakpoint
CREATE INDEX `ix_employee_job_title` ON `employees` (`job_title`);--> statement-breakpoint
CREATE INDEX `ix_employee_country_job_title` ON `employees` (`country`,`job_title`);