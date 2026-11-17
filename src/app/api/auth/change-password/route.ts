import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthError,
  createSessionToken,
  hashPassword,
  logAudit,
  requireSession,
  Role,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";

function validatePasswordComplexity(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character.";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(undefined, true);
    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current temporary password is required." },
        { status: 400 }
      );
    }
    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
      return NextResponse.json({ error: complexityError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: now,
        lastLoginAt: now,
      },
    });

    const newToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      institutionId: user.institutionId,
      mustChangePassword: false,
    });

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      institutionId: user.institutionId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      details: { clearedTempPasswordFlag: user.mustChangePassword },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
