import { db } from "@/db";
import { optimizerProfiles, optimizerRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { analyze, roles, type ProfileData } from "@/lib/optimizer-service";
import { corsOptions, rejectRequest } from "@/lib/api";
import { getOrCreateSession, withSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export function OPTIONS(request: Request) { return corsOptions(request); }
const defaults: ProfileData = { name: "", currentRole: "", targetRole: "Software Developer", industry: "Technology", yearsExperience: 0, headline: "", about: "", experience: "", skills: "", jobDescription: "" };
export async function getProfile(userId: string) {
  await db.insert(optimizerProfiles).values({ sessionId: userId }).onConflictDoNothing();
  const [profile] = await db.select().from(optimizerProfiles).where(eq(optimizerProfiles.sessionId, userId));
  return profile;
}
export async function GET(request: Request) {
  const rejected = rejectRequest(request, 100); if (rejected) return rejected;
  try {
    const { user, isNew } = await getOrCreateSession(request);
    const profile = await getProfile(user.id);
    const runs = await db.select().from(optimizerRuns).where(eq(optimizerRuns.profileId, profile.id)).orderBy(desc(optimizerRuns.createdAt)).limit(20);
    return withSessionCookie(Response.json({ success: true, profile, analysis: analyze(profile), runs, mode: process.env.AI_API_KEY ? "ai" : "demo" }), request, user.id, isNew);
  } catch (error) { console.error("Profile load failed:", error); return Response.json({ success: false, error: "Unable to load your profile. Please try again." }, { status: 500 }); }
}
export async function PUT(request: Request) {
  const rejected = rejectRequest(request, 50); if (rejected) return rejected;
  let body: Record<string,unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, error: "Invalid JSON request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ success: false, error: "Invalid profile data." }, { status: 400 });
  const patch: Partial<ProfileData> = {};
  for (const key of ["name", "currentRole", "industry", "headline", "about", "experience", "skills", "jobDescription"] as const) if (key in body) {
    if (typeof body[key] !== "string" || body[key].length > (key === "jobDescription" ? 10000 : key === "about" || key === "experience" ? 6000 : key === "skills" ? 2000 : 350)) return Response.json({ success: false, error: `Invalid ${key}.` }, { status: 400 });
    patch[key] = body[key];
  }
  if ("targetRole" in body) { if (typeof body.targetRole !== "string" || !roles.includes(body.targetRole as typeof roles[number])) return Response.json({ success: false, error: "Select a valid target role." }, { status: 400 }); patch.targetRole = body.targetRole; }
  if ("yearsExperience" in body) { if (typeof body.yearsExperience !== "number" || !Number.isInteger(body.yearsExperience) || body.yearsExperience < 0 || body.yearsExperience > 70) return Response.json({ success: false, error: "Enter valid years of experience." }, { status: 400 }); patch.yearsExperience = body.yearsExperience; }
  try {
    const { user, isNew } = await getOrCreateSession(request);
    await getProfile(user.id);
    const [profile] = await db.update(optimizerProfiles).set({ ...patch, updatedAt: new Date() }).where(eq(optimizerProfiles.sessionId, user.id)).returning();
    return withSessionCookie(Response.json({ success: true, profile, analysis: analyze(profile) }), request, user.id, isNew);
  } catch (error) { console.error("Profile save failed:", error); return Response.json({ success: false, error: "We couldn't save your profile. Please try again." }, { status: 500 }); }
}
