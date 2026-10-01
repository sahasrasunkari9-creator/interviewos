import { db } from "@/db";
import { stories, characters, scenes } from "@/db/schema";
import { and, asc, desc, eq, count } from "drizzle-orm";
import { demoIdea, makeDemoStory, type GeneratedStory, type StoryInput } from "@/lib/story-service";

export async function createStory(input: StoryInput, generated: GeneratedStory, userId: string, forceDemo = false) {
  const user = userId;
  return db.transaction(async tx => {
    const [story] = await tx.insert(stories).values({ userId: user, title: generated.title, logline: generated.logline, summary: generated.summary, demoMode: !forceDemo && process.env.AI_API_KEY ? "ai" : "demo", ...input }).returning();
    if (generated.characters.length) await tx.insert(characters).values(generated.characters.map(c => ({ storyId: story.id, name: c.name, age: typeof c.age === "number" ? c.age : null, role: c.role || "Character", personality: c.personality || "", appearance: c.appearance || "", objective: c.objective || "" })));
    if (generated.scenes.length) await tx.insert(scenes).values(generated.scenes.map((s, i) => ({ storyId: story.id, sceneNumber: i + 1, title: s.title, location: s.location || "", characters: Array.isArray(s.characters) ? s.characters : [], description: s.description || "", actions: s.actions || "", dialogue: s.dialogue || "", camera: s.camera || "", lighting: s.lighting || "", animationPrompt: s.animationPrompt || "", musicSuggestion: s.musicSuggestion || "", soundEffectSuggestion: s.soundEffectSuggestion || "" })));
    return story;
  });
}

export async function seedDemoStory(userId: string) {
  return createStory({ idea: demoIdea, genre: "Fantasy", length: "Medium", ageGroup: "Everyone", animationStyle: "Cinematic" }, makeDemoStory(), userId, true);
}

export async function listStories(userId: string) {
  return db.select({ id: stories.id, userId: stories.userId, title: stories.title, logline: stories.logline, summary: stories.summary, demoMode: stories.demoMode, idea: stories.idea, genre: stories.genre, length: stories.length, ageGroup: stories.ageGroup, animationStyle: stories.animationStyle, createdAt: stories.createdAt, updatedAt: stories.updatedAt, sceneCount: count(scenes.id) }).from(stories).leftJoin(scenes, eq(stories.id, scenes.storyId)).where(eq(stories.userId, userId)).groupBy(stories.id).orderBy(desc(stories.updatedAt));
}

export async function getStory(id: string, userId: string) {
  const [story] = await db.select().from(stories).where(and(eq(stories.id, id), eq(stories.userId, userId)));
  if (!story) return null;
  const [storyCharacters, storyScenes] = await Promise.all([
    db.select().from(characters).where(eq(characters.storyId, id)),
    db.select().from(scenes).where(eq(scenes.storyId, id)).orderBy(asc(scenes.sceneNumber)),
  ]);
  return { ...story, characters: storyCharacters, scenes: storyScenes };
}

export async function replaceStory(id: string, userId: string, input: StoryInput, generated: GeneratedStory) {
  return db.transaction(async tx => {
    const [updated] = await tx.update(stories).set({ ...input, title: generated.title, logline: generated.logline, summary: generated.summary, demoMode: process.env.AI_API_KEY ? "ai" : "demo", updatedAt: new Date() }).where(and(eq(stories.id, id), eq(stories.userId, userId))).returning();
    if (!updated) return null;
    await tx.delete(characters).where(eq(characters.storyId, id));
    await tx.delete(scenes).where(eq(scenes.storyId, id));
    if (generated.characters.length) await tx.insert(characters).values(generated.characters.map(c => ({ storyId: id, name: c.name, age: typeof c.age === "number" ? c.age : null, role: c.role || "Character", personality: c.personality || "", appearance: c.appearance || "", objective: c.objective || "" })));
    if (generated.scenes.length) await tx.insert(scenes).values(generated.scenes.map((s, i) => ({ storyId: id, sceneNumber: i + 1, title: s.title, location: s.location || "", characters: Array.isArray(s.characters) ? s.characters : [], description: s.description || "", actions: s.actions || "", dialogue: s.dialogue || "", camera: s.camera || "", lighting: s.lighting || "", animationPrompt: s.animationPrompt || "", musicSuggestion: s.musicSuggestion || "", soundEffectSuggestion: s.soundEffectSuggestion || "" })));
    return updated;
  });
}
