import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, logAudit, requireSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const designation = body.designation
      ? String(body.designation).trim()
      : undefined;

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName,
        phone,
        ...(designation ? { designation } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        designation: true,
        role: true,
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: session.userId,
      details: { fullName, phone, designation },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
