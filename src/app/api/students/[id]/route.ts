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
    const session = await requireAnyPermission(["students:read", "students:manage"]);
    const { id } = await context.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        university: true,
        institution: true,
        enrollments: {
          include: {
            batch: {
              include: {
                course: true,
                trainer: { select: { trainerCode: true, fullName: true, specialization: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 50,
          include: { batch: { select: { batchCode: true, name: true } } },
        },
        certificates: {
          include: { course: { select: { code: true, title: true } } },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, student.institutionId);

    const totalSessions = student.attendances.length;
    const presentSessions = student.attendances.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    const attendancePercent =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    const activities = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: student.id },
          { detailsJson: { contains: student.studentUid } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const canViewSensitive = session.permissions.includes("students:sensitive");

    return NextResponse.json({
      student: {
        ...student,
        maskedIdentifier: canViewSensitive ? student.maskedIdentifier : undefined,
      },
      attendanceSummary: {
        totalSessions,
        presentSessions,
        absentSessions: student.attendances.filter((a) => a.status === "ABSENT").length,
        attendancePercent,
      },
      activities,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
