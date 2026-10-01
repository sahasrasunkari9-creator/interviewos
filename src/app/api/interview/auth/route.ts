import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { interviewAccounts, interviewSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, clearSessionCookie, getAccount, passwordHash, publicAccount, tokenHash, verifyPassword } from "@/lib/interview-auth";
import { roles, difficulties } from "@/lib/interview-service";
import { corsOptions, rejectRequest } from "@/lib/api";
export const dynamic = "force-dynamic";
export function OPTIONS(request: Request) { return corsOptions(request); }
export async function GET(request: Request) {
  const rejected = rejectRequest(request, 100); if (rejected) return rejected;
  try { const account = await getAccount(request); return Response.json({ success: true, account: account ? publicAccount(account) : null, mode: process.env.AI_API_KEY ? "ai" : "demo" }); }
  catch { return Response.json({ success: false, error: "Unable to load your session." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const rejected = rejectRequest(request, 15); if (rejected) return rejected;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  const action = body.action;
  if (action === "logout") {
    try { const raw = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("interview_session="))?.split("=")[1]; if (raw) await db.delete(interviewSessions).where(eq(interviewSessions.tokenHash, tokenHash(raw))); const res = Response.json({ success: true }); res.headers.set("Set-Cookie", clearSessionCookie()); return res; } catch { return Response.json({ success: false, error: "Unable to sign out." }, { status: 500 }); }
  }
  if (!["register", "login", "guest"].includes(String(action))) return Response.json({ success: false, error: "Invalid action." }, { status: 400 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (action !== "guest" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || password.length < 8 || password.length > 128)) return Response.json({ success: false, error: "Enter a valid email and password of at least 8 characters." }, { status: 400 });
  if (action === "register" && (name.length < 2 || name.length > 80)) return Response.json({ success: false, error: "Enter your name (2–80 characters)." }, { status: 400 });
  try {
    let account;
    if (action === "guest") {
      const existing = await getAccount(request);
      if (existing) return Response.json({ success: true, account: publicAccount(existing), mode: process.env.AI_API_KEY ? "ai" : "demo" });
      const [created] = await db.insert(interviewAccounts).values({ name: "Demo candidate", email: `guest-${randomUUID()}@interview.local` }).returning(); account = created;
    } else if (action === "register") {
      const exists = await db.select({ id: interviewAccounts.id }).from(interviewAccounts).where(eq(interviewAccounts.email, email)).limit(1);
      if (exists.length) return Response.json({ success: false, error: "An account with this email already exists." }, { status: 409 });
      const [created] = await db.insert(interviewAccounts).values({ name, email, passwordHash: passwordHash(password) }).returning(); account = created;
    } else {
      const [found] = await db.select().from(interviewAccounts).where(eq(interviewAccounts.email, email)).limit(1);
      if (!found?.passwordHash || !verifyPassword(password, found.passwordHash)) return Response.json({ success: false, error: "Incorrect email or password." }, { status: 401 });
      account = found;
    }
    const res = Response.json({ success: true, account: publicAccount(account), mode: process.env.AI_API_KEY ? "ai" : "demo" });
    res.headers.set("Set-Cookie", await createSession(account.id, request)); return res;
  } catch (error) { console.error("Interview auth failed:", error); return Response.json({ success: false, error: "Unable to continue. Please try again." }, { status: 500 }); }
}
export async function PUT(request: Request) {
  const rejected = rejectRequest(request, 30); if (rejected) return rejected;
  try {
    const account = await getAccount(request); if (!account) return Response.json({ success: false, error: "Sign in to update your profile." }, { status: 401 });
    const body = await request.json(); const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80 || !roles.includes(body.targetRole) || !difficulties.includes(body.experienceLevel)) return Response.json({ success: false, error: "Enter a valid name, role and experience level." }, { status: 400 });
    const [updated] = await db.update(interviewAccounts).set({ name, targetRole: body.targetRole, experienceLevel: body.experienceLevel }).where(eq(interviewAccounts.id, account.id)).returning();
    return Response.json({ success: true, account: publicAccount(updated) });
  } catch { return Response.json({ success: false, error: "Unable to save settings." }, { status: 500 }); }
}
