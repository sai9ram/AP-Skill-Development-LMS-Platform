import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertInstitutionScope,
  AuthError,
  logAudit,
  requirePermission,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "BULK_STATUS_UPDATE") {
      const session = await requirePermission("students:manage");
      const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];
      const isActive = Boolean(body.isActive);

      if (studentIds.length === 0) {
        return NextResponse.json({ error: "No students selected" }, { status: 400 });
      }

      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, institutionId: true },
      });
      for (const s of students) {
        await assertInstitutionScope(session, s.institutionId);
      }

      await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: {
          isActive,
          status: isActive ? "ACTIVE" : "INACTIVE",
          isDeleted: !isActive,
          deletedAt: isActive ? null : new Date(),
          deletedBy: isActive ? null : session.email,
          updatedBy: session.email,
        },
      });

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: session.institutionId,
        action: "BULK_STATUS_UPDATE",
        module: "BulkOperations",
        entityType: "Student",
        details: { count: studentIds.length, isActive },
      });

      return NextResponse.json({ ok: true, count: studentIds.length });
    }

    if (action === "BULK_ENROLL") {
      const session = await requirePermission("batches:manage");
      const batchId = String(body.batchId || "");
      const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      await assertInstitutionScope(session, batch.institutionId);

      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, institutionId: true },
      });

      let enrolled = 0;
      for (const s of students) {
        if (s.institutionId !== batch.institutionId) continue;
        await prisma.batchEnrollment.upsert({
          where: { batchId_studentId: { batchId, studentId: s.id } },
          update: { status: "ACTIVE" },
          create: {
            batchId,
            studentId: s.id,
            courseId: batch.courseId,
            institutionId: batch.institutionId,
          },
        });
        enrolled += 1;
      }

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: batch.institutionId,
        action: "BULK_ENROLL",
        module: "BulkOperations",
        entityType: "BatchEnrollment",
        entityId: batchId,
        details: { batchId, enrolled },
      });

      return NextResponse.json({ ok: true, enrolled });
    }

    if (action === "BULK_ATTENDANCE") {
      const session = await requirePermission("attendance:mark");
      const batchId = String(body.batchId || "");
      const date = String(body.date || "");
      const status = String(body.status || "PRESENT").toUpperCase();
      const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      await assertInstitutionScope(session, batch.institutionId);

      for (const sid of studentIds) {
        await prisma.attendance.upsert({
          where: { batchId_studentId_date: { batchId, studentId: sid, date } },
          update: { status, markedById: session.userId },
          create: {
            batchId,
            studentId: sid,
            courseId: batch.courseId,
            institutionId: batch.institutionId,
            trainerId: batch.trainerId,
            date,
            status,
            markedById: session.userId,
          },
        });
      }

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: batch.institutionId,
        action: "BULK_ATTENDANCE",
        module: "BulkOperations",
        entityType: "Attendance",
        entityId: batchId,
        details: { batchId, date, status, count: studentIds.length },
      });

      return NextResponse.json({ ok: true, count: studentIds.length });
    }

    return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 400 });
  }
}
