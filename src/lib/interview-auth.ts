import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { interviewAccounts, interviewSessions } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

const cookie = "interview_session";
export function passwordHash(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
export function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(":"); if (!salt || !hash) return false; const expected = Buffer.from(hash, "hex"); const actual = scryptSync(password, salt, expected.length); return expected.length === actual.length && timingSafeEqual(expected, actual); }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function getAccount(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(cookie + "="))?.slice(cookie.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [session] = await db.select().from(interviewSessions).where(and(eq(interviewSessions.tokenHash, tokenHash(token)), gt(interviewSessions.expiresAt, new Date()))).limit(1);
  if (!session) return null;
  const [account] = await db.select().from(interviewAccounts).where(eq(interviewAccounts.id, session.accountId)).limit(1);
  return account || null;
}
export async function createSession(accountId: string, request: Request) {
  const token = randomBytes(32).toString("hex");
  await db.insert(interviewSessions).values({ accountId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 30 * 86400000) });
  const secure = request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  return `${cookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`;
}
export function clearSessionCookie() { return `${cookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`; }
export function publicAccount(account: typeof interviewAccounts.$inferSelect) { return { id: account.id, name: account.name, email: account.email.startsWith("guest-") ? "" : account.email, guest: account.passwordHash === null, targetRole: account.targetRole, experienceLevel: account.experienceLevel, createdAt: account.createdAt }; }
