import { db } from "@/db";
import { optimizerRuns } from "@/db/schema";
import { generateContent, tools, type Tool } from "@/lib/optimizer-service";
import { getProfile } from "@/app/api/optimizer/profile/route";
import { corsOptions, rejectRequest } from "@/lib/api";
import { getOrCreateSession, withSessionCookie } from "@/lib/session";

export function OPTIONS(request: Request) { return corsOptions(request); }
export async function POST(request: Request) {
  const rejected = rejectRequest(request, 18); if (rejected) return rejected;
  let body: Record<string,unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, error: "Invalid JSON request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !tools.includes(body.tool as Tool) || typeof body.input !== "string" || body.input.length > 10000) return Response.json({ success: false, error: "Choose a valid tool and provide valid input." }, { status: 400 });
  const tool = body.tool as Tool;
  const input = body.input.trim();
  try {
    const { user, isNew } = await getOrCreateSession(request);
    const profile = await getProfile(user.id);
    if (tool === "experience" && input.length < 15) return Response.json({ success: false, error: "Add at least 15 characters describing your experience." }, { status: 400 });
    if (tool === "keywords" && (input || profile.jobDescription).trim().length < 30) return Response.json({ success: false, error: "Paste a job description of at least 30 characters." }, { status: 400 });
    if (["headline", "summary", "objective", "career"].includes(tool) && !profile.name.trim() && !profile.currentRole.trim() && !input) return Response.json({ success: false, error: "Add your name or current role in your profile first." }, { status: 400 });
    let generated;
    try { generated = await generateContent(tool, profile, input); }
    catch (error) { console.error("Optimizer AI error:", error); return Response.json({ success: false, error: "The AI service couldn't generate a result. Please try again." }, { status: 502 }); }
    try {
      const [run] = await db.insert(optimizerRuns).values({ profileId: profile.id, tool, input, output: generated.output, mode: generated.mode }).returning();
      return withSessionCookie(Response.json({ success: true, run }), request, user.id, isNew);
    } catch (error) { console.error("Optimizer save error:", error); return Response.json({ success: false, error: "We couldn't save this result. Please try again." }, { status: 500 }); }
  } catch (error) { console.error("Optimizer request error:", error); return Response.json({ success: false, error: "Unable to connect to the service. Please try again." }, { status: 500 }); }
}
