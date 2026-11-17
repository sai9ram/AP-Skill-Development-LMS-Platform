import { NextResponse } from "next/server";
import { getSession, logAudit, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "LOGOUT",
      entityType: "Auth",
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
