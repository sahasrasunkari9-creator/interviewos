import { createStory, getStory, listStories, seedDemoStory } from "@/lib/story-repository";
import { generateStory } from "@/lib/story-service";
import { corsOptions, errorResponse, invalidInput, parseStoryInput, rejectRequest } from "@/lib/api";
import { getOrCreateSession, withSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export function OPTIONS(request: Request) { return corsOptions(request); }
export async function GET(request: Request) {
  const rejected = rejectRequest(request, 90); if (rejected) return rejected;
  try {
    const { user, isNew } = await getOrCreateSession(request);
    if (isNew) await seedDemoStory(user.id);
    const response = Response.json({ success: true, stories: await listStories(user.id) });
    return withSessionCookie(response, request, user.id, isNew);
  } catch (e) { return errorResponse(e); }
}
export async function POST(request: Request) {
  const rejected = rejectRequest(request, 10); if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); } catch { return invalidInput(); }
  const input = parseStoryInput(body); if (!input) return invalidInput();
  let generated;
  try { generated = await generateStory(input); }
  catch (e) { console.error("AI generation failed:", e); return Response.json({ success: false, error: "Something went wrong while generating your story. Please try again." }, { status: 502 }); }
  try {
    const { user, isNew } = await getOrCreateSession(request);
    const created = await createStory(input, generated, user.id);
    const story = await getStory(created.id, user.id);
    const response = Response.json({ success: true, storyId: created.id, title: created.title, summary: created.summary, logline: created.logline, demoMode: created.demoMode === "demo", characters: story?.characters || [], scenes: story?.scenes || [], story }, { status: 201 });
    return withSessionCookie(response, request, user.id, isNew);
  } catch (e) { console.error("Database save failed:", e); return Response.json({ success: false, error: "We couldn't save your story. Please try again." }, { status: 500 }); }
}
