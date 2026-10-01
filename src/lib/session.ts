import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const cookieName = "storyverse_session";
export async function existingSession(request: Request) {
  const id = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!id || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user || null;
}
export async function getOrCreateSession(request: Request) {
  const existing = await existingSession(request);
  if (existing) return { user: existing, isNew: false };
  const id = randomUUID();
  const [user] = await db.insert(users).values({ id, name: "TaleForge Creator", email: `visitor-${id}@storyverse.local` }).returning();
  return { user, isNew: true };
}
export function withSessionCookie(response: Response, request: Request, userId: string, isNew: boolean) {
  if (isNew) {
    const secure = request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
    response.headers.set("Set-Cookie", `${cookieName}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`);
  }
  return response;
}
