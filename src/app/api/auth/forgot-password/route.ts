import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim();

    if (!identifier) {
      return NextResponse.json(
        { error: "Please enter your Admin Username or Official Email." },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { username: identifier.toUpperCase() },
      select: { id: true, email: true, username: true, role: true, institutionId: true },
    });

    if (user) {
      await prisma.notification.create({
        data: {
          title: "Password Reset Requested",
          message: `Administrator ${user.username || user.email} requested a temporary password reset.`,
          institutionId: null, // Visible to Super Admin
        },
      });
      await logAudit({
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        institutionId: user.institutionId,
        action: "PASSWORD_RESET_REQUESTED",
        module: "Auth",
        entityType: "User",
        entityId: user.id,
        details: { identifier },
      });
    }

    // Generic response to prevent account enumeration
    return NextResponse.json({
      ok: true,
      message:
        "If an active account matches your identifier, a password reset request has been routed to the Super Admin.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process password reset request." },
      { status: 500 }
    );
  }
}
