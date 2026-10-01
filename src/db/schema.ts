import { pgTable, uuid, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const interviewAccounts = pgTable("interview_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  targetRole: text("target_role").notNull().default("Software Developer"),
  experienceLevel: text("experience_level").notNull().default("Beginner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const interviewSessions = pgTable("interview_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => interviewAccounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const interviewRuns = pgTable("interview_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => interviewAccounts.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  role: text("role").notNull(),
  difficulty: text("difficulty").notNull(),
  company: text("company").notNull().default("General"),
  questions: jsonb("questions").$type<{ question: string; topic: string; keywords: string[] }[]>().notNull(),
  answers: jsonb("answers").$type<string[]>().notNull().default([]),
  feedback: jsonb("feedback").$type<Record<string, unknown>>(),
  mode: text("mode").notNull().default("demo"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  logline: text("logline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  demoMode: text("demo_mode").notNull().default("demo"),
  idea: text("idea").notNull(),
  genre: text("genre").notNull(),
  length: text("length").notNull(),
  ageGroup: text("age_group").notNull().default("Everyone"),
  animationStyle: text("animation_style").notNull().default("Cinematic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age"),
  role: text("role").notNull(),
  personality: text("personality").notNull().default(""),
  appearance: text("appearance").notNull().default(""),
  objective: text("objective").notNull().default(""),
});

export const optimizerProfiles = pgTable("optimizer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  name: text("name").notNull().default(""),
  currentRole: text("current_role").notNull().default(""),
  targetRole: text("target_role").notNull().default("Software Developer"),
  industry: text("industry").notNull().default("Technology"),
  yearsExperience: integer("years_experience").notNull().default(0),
  headline: text("headline").notNull().default(""),
  about: text("about").notNull().default(""),
  experience: text("experience").notNull().default(""),
  skills: text("skills").notNull().default(""),
  jobDescription: text("job_description").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const optimizerRuns = pgTable("optimizer_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => optimizerProfiles.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  input: text("input").notNull(),
  output: text("output").notNull(),
  mode: text("mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scenes = pgTable("scenes", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  sceneNumber: integer("scene_number").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull().default(""),
  characters: jsonb("characters").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  actions: text("actions").notNull().default(""),
  dialogue: text("dialogue").notNull().default(""),
  camera: text("camera").notNull().default(""),
  lighting: text("lighting").notNull().default(""),
  animationPrompt: text("animation_prompt").notNull().default(""),
  musicSuggestion: text("music_suggestion").notNull().default(""),
  soundEffectSuggestion: text("sound_effect_suggestion").notNull().default(""),
});
