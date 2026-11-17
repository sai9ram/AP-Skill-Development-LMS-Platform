import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertInstitutionScope,
  AuthError,
  logAudit,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";
import { handleApiError } from "@/lib/apiError";
import { assertValidTransition, BATCH_TRANSITIONS } from "@/lib/workflows";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["batches:read", "batches:manage"]);
    const requestedInstId = req.nextUrl.searchParams.get("institutionId");

    const where: Record<string, unknown> = {};
    if (session.scope !== "STATEWIDE" && session.scope !== "DISTRICT") {
      if (requestedInstId && requestedInstId !== session.institutionId) {
        await assertInstitutionScope(session, requestedInstId);
      }
      where.institutionId = session.institutionId!;
    } else if (requestedInstId && requestedInstId !== "ALL") {
      where.institutionId = requestedInstId;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        institution: { select: { id: true, name: true, code: true, district: true } },
        course: { select: { id: true, code: true, title: true, durationHours: true } },
        trainer: { select: { id: true, trainerCode: true, fullName: true, specialization: true } },
        batchTrainers: {
          where: { status: "ACTIVE" },
          include: { trainer: { select: { id: true, trainerCode: true, fullName: true } } },
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                studentUid: true,
                universityRollNo: true,
                fullName: true,
                branch: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ batches });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("batches:manage");
    const body = await req.json();

    const institutionId =
      session.scope !== "STATEWIDE" && session.scope !== "DISTRICT"
        ? session.institutionId!
        : String(body.institutionId || "");
    const courseId = String(body.courseId || "");
    const name = String(body.name || "").trim();
    const startDate = String(body.startDate || "2026-11-20");
    const endDate = String(body.endDate || "2027-02-20");
    const maxCapacity = Number(body.maxCapacity || 60);
    const location = String(body.location || "Campus Skill Lab").trim();
    const trainingMode = String(body.trainingMode || "Offline").trim();
    const trainerId =
      session.permissions.includes("trainers:manage") && body.trainerId
        ? String(body.trainerId)
        : null;

    if (!institutionId || !courseId || !name) {
      return NextResponse.json(
        { error: "Institution, course, and batch name are required" },
        { status: 400 }
      );
    }

    await assertInstitutionScope(session, institutionId);

    if (session.scope !== "STATEWIDE" && session.scope !== "DISTRICT") {
      const assigned = await prisma.institutionCourse.findUnique({
        where: { institutionId_courseId: { institutionId, courseId } },
      });
      if (!assigned) {
        return NextResponse.json(
          { error: "Selected course is not assigned to your institution" },
          { status: 403 }
        );
      }
    }

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: { university: true },
    });
    const count = await prisma.batch.count();
    const autoBatchCode = `BAT-${institution?.university.code || "AP"}-${
      institution?.code.replace(/[^A-Za-z0-9]/g, "") || "INST"
    }-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    const batchCode = String(body.batchCode || "").trim().toUpperCase() || autoBatchCode;

    const batch = await prisma.batch.create({
      data: {
        batchCode,
        name,
        institutionId,
        courseId,
        trainerId,
        startDate,
        endDate,
        maxCapacity,
        location,
        trainingMode,
        status: String(body.status || "ACTIVE").toUpperCase(),
        createdBy: session.email,
      },
      include: {
        course: { select: { code: true, title: true } },
        trainer: { select: { fullName: true } },
      },
    });

    if (trainerId) {
      await prisma.batchTrainer.create({
        data: {
          batchId: batch.id,
          trainerId,
          role: "LEAD_TRAINER",
          status: "ACTIVE",
        },
      });
    }

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId,
      action: "CREATE_BATCH",
      entityType: "Batch",
      entityId: batch.id,
      details: { batchCode, name, courseId, trainerId, trainingMode },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create batch (batch code may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["batches:manage", "trainers:manage"]);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Batch id is required" }, { status: 400 });
    }

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, existing.institutionId);

    if (body.action === "ENROLL_STUDENT") {
      const studentId = String(body.studentId || "");
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.institutionId !== existing.institutionId) {
        return NextResponse.json(
          { error: "Student does not belong to this batch's institution" },
          { status: 403 }
        );
      }

      const enrollment = await prisma.batchEnrollment.upsert({
        where: { batchId_studentId: { batchId: id, studentId } },
        update: {
          status: "ACTIVE",
          courseId: existing.courseId,
          institutionId: existing.institutionId,
        },
        create: {
          batchId: id,
          studentId,
          courseId: existing.courseId,
          institutionId: existing.institutionId,
          progressPercent: 0,
        },
      });

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: existing.institutionId,
        action: "ENROLL_STUDENT_IN_BATCH",
        entityType: "BatchEnrollment",
        entityId: enrollment.id,
        details: { batchId: id, studentId },
      });

      return NextResponse.json({ enrollment });
    }

    if (body.action === "UPDATE_PROGRESS") {
      const studentId = String(body.studentId || "");
      const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent || 0)));
      const completed = progressPercent === 100;
      const enrollment = await prisma.batchEnrollment.update({
        where: { batchId_studentId: { batchId: id, studentId } },
        data: {
          progressPercent,
          status: completed ? "COMPLETED" : "ACTIVE",
          completionStatus: completed ? "COMPLETED" : "IN_PROGRESS",
          completionDate: completed ? new Date() : null,
          certificateStatus: completed ? "ISSUED" : "PENDING",
        },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: existing.institutionId,
        action: "UPDATE_TRAINING_PROGRESS",
        entityType: "BatchEnrollment",
        entityId: enrollment.id,
        details: { batchId: id, studentId, progressPercent },
      });
      return NextResponse.json({ enrollment });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.status !== undefined) {
      const nextStatus = String(body.status).toUpperCase();
      assertValidTransition(BATCH_TRANSITIONS, existing.status, nextStatus, "Batch");
      data.status = nextStatus;
    }
    if (body.trainingMode !== undefined) data.trainingMode = String(body.trainingMode).trim();
    if (body.location !== undefined) data.location = String(body.location).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.trainerId !== undefined) {
      if (!session.permissions.includes("trainers:manage")) {
        return NextResponse.json(
          { error: "Missing permission (trainers:manage) to assign trainers to batches" },
          { status: 403 }
        );
      }
      const nextTrainerId = body.trainerId ? String(body.trainerId) : null;
      data.trainerId = nextTrainerId;

      if (nextTrainerId) {
        await prisma.batchTrainer.upsert({
          where: { batchId_trainerId: { batchId: id, trainerId: nextTrainerId } },
          update: { status: "ACTIVE", assignedDate: new Date() },
          create: {
            batchId: id,
            trainerId: nextTrainerId,
            role: String(body.trainerRole || "LEAD_TRAINER"),
            status: "ACTIVE",
          },
        });
      }
    }

    const batch = await prisma.batch.update({ where: { id }, data });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: existing.institutionId,
      action: body.trainerId !== undefined ? "ASSIGN_TRAINER_TO_BATCH" : "UPDATE_BATCH",
      entityType: "Batch",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ batch });
  } catch (err) {
    return handleApiError(err);
  }
}
