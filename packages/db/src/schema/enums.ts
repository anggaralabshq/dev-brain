import { pgEnum } from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "planning",
  "on-hold",
  "archived",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "editor",
  "viewer",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "archived",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const adrStatusEnum = pgEnum("adr_status", [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
]);

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type AdrStatus = (typeof adrStatusEnum.enumValues)[number];

export const meetingStatusEnum = pgEnum("meeting_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export type MeetingStatus = (typeof meetingStatusEnum.enumValues)[number];
