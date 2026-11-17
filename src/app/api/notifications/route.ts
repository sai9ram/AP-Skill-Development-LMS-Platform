import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();

    const where =
      session.scope === "STATEWIDE" || session.scope === "DISTRICT"
        ? {}
        : {
            OR: [
              { institutionId: session.institutionId! },
              { userId: session.userId },
              { institutionId: null, userId: null },
            ],
          };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: { institution: { select: { code: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    if (body.markAllRead) {
      const where =
        session.scope === "STATEWIDE" || session.scope === "DISTRICT"
          ? { isRead: false }
          : {
              isRead: false,
              OR: [
                { institutionId: session.institutionId! },
                { userId: session.userId },
              ],
            };
      await prisma.notification.updateMany({ where, data: { isRead: true } });
      return NextResponse.json({ ok: true });
    }

    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return NextResponse.json({ notification: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update notification" }, { status: 400 });
  }
}
