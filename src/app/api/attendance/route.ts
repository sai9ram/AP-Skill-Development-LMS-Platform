import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertInstitutionScope,
  AuthError,
  logAudit,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["attendance:read", "attendance:mark"]);
    const batchId = req.nextUrl.searchParams.get("batchId") || "";
    const date =
      req.nextUrl.searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: { select: { id: true, code: true, title: true } },
        institution: { select: { id: true, name: true, code: true } },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                studentUid: true,
                universityRollNo: true,
                fullName: true,
                branch: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, batch.institutionId);

    const [existingRecords, allBatchAttendance] = await Promise.all([
      prisma.attendance.findMany({ where: { batchId, date } }),
      prisma.attendance.findMany({
        where: { batchId },
        select: { studentId: true, date: true, status: true },
      }),
    ]);

    const conductedDates = new Set(allBatchAttendance.map((a) => a.date));
    const totalConductedSessions = conductedDates.size;

    const statusByStudent = new Map(
      existingRecords.map((r) => [r.studentId, { status: r.status, remarks: r.remarks }])
    );

    const statsByStudent = new Map<
      string,
      { present: number; absent: number; late: number; excused: number; total: number }
    >();
    for (const rec of allBatchAttendance) {
      const cur = statsByStudent.get(rec.studentId) || {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      cur.total += 1;
      if (rec.status === "PRESENT") cur.present += 1;
      else if (rec.status === "ABSENT") cur.absent += 1;
      else if (rec.status === "LATE") cur.late += 1;
      else if (rec.status === "EXCUSED") cur.excused += 1;
      statsByStudent.set(rec.studentId, cur);
    }

    const roster = batch.enrollments.map((e) => {
      const sStats = statsByStudent.get(e.studentId) || {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      const denom = sStats.total || totalConductedSessions;
      const attendancePercent =
        denom > 0 ? Math.round((sStats.present / denom) * 100) : 0;

      return {
        student: e.student,
        progressPercent: e.progressPercent,
        enrollmentStatus: e.status,
        status: statusByStudent.get(e.studentId)?.status ?? "PRESENT",
        remarks: statusByStudent.get(e.studentId)?.remarks ?? "",
        alreadyMarked: statusByStudent.has(e.studentId),
        summary: {
          ...sStats,
          totalConductedSessions,
          attendancePercent,
        },
      };
    });

    return NextResponse.json({
      batch: {
        id: batch.id,
        batchCode: batch.batchCode,
        name: batch.name,
        course: batch.course,
        institution: batch.institution,
      },
      date,
      totalConductedSessions,
      roster,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("attendance:mark");
    const body = await req.json();
    const batchId = String(body.batchId || "");
    const date = String(body.date || "");
    const records: Array<{ studentId: string; status: string; remarks?: string }> =
      Array.isArray(body.records) ? body.records : [];

    if (!batchId || !date || records.length === 0) {
      return NextResponse.json(
        { error: "batchId, date, and attendance records are required" },
        { status: 400 }
      );
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { enrollments: { select: { studentId: true } } },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, batch.institutionId);

    const enrolledSet = new Set(batch.enrollments.map((e) => e.studentId));
    const allowedStatuses = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

    for (const rec of records) {
      if (!enrolledSet.has(rec.studentId)) {
        return NextResponse.json(
          { error: `Student ${rec.studentId} is not enrolled in this batch` },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      records.map((rec) => {
        const st = allowedStatuses.has(rec.status) ? rec.status : "PRESENT";
        return prisma.attendance.upsert({
          where: {
            batchId_studentId_date: {
              batchId,
              studentId: rec.studentId,
              date,
            },
          },
          update: {
            status: st,
            remarks: rec.remarks || null,
            markedById: session.userId,
            courseId: batch.courseId,
            institutionId: batch.institutionId,
            trainerId: batch.trainerId,
          },
          create: {
            batchId,
            studentId: rec.studentId,
            courseId: batch.courseId,
            institutionId: batch.institutionId,
            trainerId: batch.trainerId,
            date,
            status: st,
            remarks: rec.remarks || null,
            markedById: session.userId,
          },
        });
      })
    );

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: batch.institutionId,
      action: "MARK_BATCH_ATTENDANCE",
      entityType: "Attendance",
      entityId: batchId,
      details: { date, recordCount: records.length },
    });

    return NextResponse.json({ ok: true, count: records.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 400 });
  }
}
