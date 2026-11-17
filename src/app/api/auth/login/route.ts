import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  logAudit,
  Role,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = String(body.identifier || body.email || "").trim();
    const password = String(body.password || "");

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rlKey = `login:${ip}:${rawIdentifier.toLowerCase()}`;
    const rl = checkRateLimit(rlKey, 15, 5 * 60 * 1000);
    if (!rl.allowed) {
      await logAudit({
        actorRole: "ANONYMOUS",
        actorEmail: rawIdentifier || "unknown",
        action: "LOGIN_RATE_LIMITED",
        module: "Security",
        entityType: "Auth",
        details: { retryAfterSeconds: rl.retryAfterSeconds },
      });
      return NextResponse.json(
        { error: `Too many login attempts. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 }
      );
    }

    const isEmail = rawIdentifier.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: rawIdentifier.toLowerCase() }
        : { username: rawIdentifier.toUpperCase() },
      include: { institution: true },
    });

    if (!user || !user.isActive) {
      await logAudit({
        actorRole: "ANONYMOUS",
        actorEmail: rawIdentifier,
        action: "LOGIN_FAILED",
        entityType: "Auth",
        details: { reason: user ? "Account deactivated" : "Unknown email/username" },
      });
      return NextResponse.json(
        { error: "Invalid credentials or deactivated account" },
        { status: 401 }
      );
    }

    if (user.role === "COLLEGE_ADMIN" && user.institution && !user.institution.isActive) {
      return NextResponse.json(
        { error: "Your institution is currently deactivated. Contact Super Admin." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logAudit({
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        institutionId: user.institutionId,
        action: "LOGIN_FAILED",
        entityType: "Auth",
        details: { reason: "Invalid password" },
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    resetRateLimit(rlKey);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      institutionId: user.institutionId,
      mustChangePassword: user.mustChangePassword,
    });

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      institutionId: user.institutionId,
      action: "LOGIN_SUCCESS",
      entityType: "Auth",
      details: { mustChangePassword: user.mustChangePassword },
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name ?? null,
        mustChangePassword: user.mustChangePassword,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
