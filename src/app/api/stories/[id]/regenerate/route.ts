import { getStory, replaceStory } from "@/lib/story-repository";
import { generateStory } from "@/lib/story-service";
import { corsOptions, errorResponse, rejectRequest, validId } from "@/lib/api";
import { existingSession } from "@/lib/session";

export function OPTIONS(request: Request) { return corsOptions(request); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rejected = rejectRequest(request, 10); if (rejected) return rejected;
  const { id } = await params; if (!validId(id)) return Response.json({ success: false, error: "Invalid story ID" }, { status: 400 });
  try {
    const user = await existingSession(request); if (!user) return Response.json({ success: false, error: "Session required" }, { status: 401 });
    const existing = await getStory(id, user.id); if (!existing) return Response.json({ success: false, error: "Story not found" }, { status: 404 });
    const input = { idea: existing.idea, genre: existing.genre, length: existing.length, ageGroup: existing.ageGroup, animationStyle: existing.animationStyle };
    let generated;
    try { generated = await generateStory(input); } catch (e) { console.error("Regeneration failed:", e); return Response.json({ success: false, error: "Something went wrong while generating your story. Please try again." }, { status: 502 }); }
    await replaceStory(id, user.id, input, generated);
    return Response.json({ success: true, story: await getStory(id, user.id) });
  } catch (e) { return errorResponse(e); }
}
