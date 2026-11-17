import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertInstitutionScope,
  AuthError,
  requireAnyPermission,
} from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAnyPermission(["batches:read", "batches:manage"]);
    const { id } = await context.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        institution: { include: { university: { select: { code: true, name: true } } } },
        course: true,
        trainer: true,
        batchTrainers: {
          where: { status: "ACTIVE" },
          include: { trainer: true },
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                studentUid: true,
                universityRollNo: true,
                fullName: true,
                email: true,
                phone: true,
                branch: true,
                status: true,
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 100,
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, batch.institutionId);

    const conductedDates = Array.from(
      new Set(batch.attendances.map((a) => a.date))
    ).sort((a, b) => b.localeCompare(a));

    const totalAttendance = batch.attendances.length;
    const presentAttendance = batch.attendances.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    const avgAttendance =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 0;

    const avgProgress =
      batch.enrollments.length > 0
        ? Math.round(
            batch.enrollments.reduce((s, e) => s + e.progressPercent, 0) /
              batch.enrollments.length
          )
        : 0;

    const activities = await prisma.auditLog.findMany({
      where: { entityId: batch.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return NextResponse.json({
      batch,
      metrics: {
        enrolledCount: batch.enrollments.length,
        conductedSessions: conductedDates.length,
        avgAttendance,
        avgProgress,
      },
      conductedDates,
      activities,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
