CREATE TABLE `aiSearchUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiSearchUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','analyst','developer','engineer','expert') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` varchar(32) DEFAULT 'inactive';