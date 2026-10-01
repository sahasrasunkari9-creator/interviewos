import { db } from "@/db";
import { interviewRuns } from "@/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getAccount } from "@/lib/interview-auth";
import { generateQuestions, generateFeedback, isConfig, technicalTopics } from "@/lib/interview-service";
import { corsOptions, rejectRequest } from "@/lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS(request: Request) { return corsOptions(request); }
const unauthorized = () => Response.json({ success: false, error: "Sign in or use the guest demo to practice." }, { status: 401 });
export async function GET(request: Request) {
  const rejected = rejectRequest(request, 90); if (rejected) return rejected;
  try { const account = await getAccount(request); if (!account) return unauthorized();
    const runs = await db.select().from(interviewRuns).where(and(eq(interviewRuns.accountId, account.id), isNotNull(interviewRuns.completedAt))).orderBy(desc(interviewRuns.completedAt)).limit(60);
    const avg = runs.length ? Math.round(runs.reduce((n,r) => n + Number((r.feedback as { overall?: number } | null)?.overall || 0),0) / runs.length) : 0;
    const dates = new Set(runs.map(r => r.completedAt?.toISOString().slice(0,10)));
    let streak = 0; const start = new Date(); if (!dates.has(start.toISOString().slice(0,10))) start.setUTCDate(start.getUTCDate()-1);
    while (dates.has(start.toISOString().slice(0,10))) { streak++; start.setUTCDate(start.getUTCDate()-1); }
    return Response.json({ success: true, history: runs, stats: { completed: runs.length, average: avg, streak, points: runs.length * 120 + runs.filter(r => Number((r.feedback as { overall?: number } | null)?.overall || 0) >= 75).length * 50 } });
  } catch (e) { console.error(e); return Response.json({ success: false, error: "Unable to load interview history." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const rejected = rejectRequest(request, 12); if (rejected) return rejected;
  try {
    const account = await getAccount(request); if (!account) return unauthorized();
    let body; try { body = await request.json(); } catch { return Response.json({ success: false, error: "Invalid request." }, { status: 400 }); }
    if (!isConfig(body) || (body.topic !== undefined && !technicalTopics.includes(body.topic))) return Response.json({ success: false, error: "Choose a valid interview type, role, and difficulty." }, { status: 400 });
    let result; try { result = await generateQuestions(body, body.topic || "Mixed"); } catch (e) { console.error(e); return Response.json({ success: false, error: "Could not generate questions. Please try again." }, { status: 502 }); }
    const [run] = await db.insert(interviewRuns).values({ accountId: account.id, category: body.category, role: body.role, difficulty: body.difficulty, company: body.company, questions: result.questions, mode: result.mode }).returning();
    return Response.json({ success: true, run }, { status: 201 });
  } catch (e) { console.error(e); return Response.json({ success: false, error: "Unable to start interview." }, { status: 500 }); }
}
export async function PUT(request: Request) {
  const rejected = rejectRequest(request, 20); if (rejected) return rejected;
  try {
    const account = await getAccount(request); if (!account) return unauthorized();
    let body; try { body = await request.json(); } catch { return Response.json({ success: false, error: "Invalid request." }, { status: 400 }); }
    if (!body || typeof body.runId !== "string" || !/^[0-9a-f-]{36}$/.test(body.runId) || !Array.isArray(body.answers) || body.answers.length !== 5 || !body.answers.every((a: unknown) => typeof a === "string" && a.length <= 6000)) return Response.json({ success: false, error: "Invalid answers. Keep each answer under 6,000 characters." }, { status: 400 });
    const [run] = await db.select().from(interviewRuns).where(and(eq(interviewRuns.id, body.runId), eq(interviewRuns.accountId, account.id))).limit(1);
    if (!run) return Response.json({ success: false, error: "Interview not found." }, { status: 404 });
    if (run.completedAt) return Response.json({ success: false, error: "This interview is already complete." }, { status: 409 });
    let result; try { result = await generateFeedback(run.questions, body.answers); } catch (e) { console.error(e); return Response.json({ success: false, error: "Unable to analyze answers. Your responses are still available; please retry." }, { status: 502 }); }
    const [updated] = await db.update(interviewRuns).set({ answers: body.answers, feedback: result.feedback, mode: result.mode, completedAt: new Date() }).where(eq(interviewRuns.id, run.id)).returning();
    return Response.json({ success: true, run: updated });
  } catch (e) { console.error(e); return Response.json({ success: false, error: "Unable to save interview. Please retry." }, { status: 500 }); }
}
