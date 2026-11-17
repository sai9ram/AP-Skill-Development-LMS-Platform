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
import { assertValidTransition, STUDENT_TRANSITIONS } from "@/lib/workflows";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["students:read", "students:manage"]);
    const search = (req.nextUrl.searchParams.get("search") || "").trim();
    const requestedInstId = req.nextUrl.searchParams.get("institutionId");
    const universityId = req.nextUrl.searchParams.get("universityId");
    const district = req.nextUrl.searchParams.get("district");
    const courseId = req.nextUrl.searchParams.get("courseId");
    const batchId = req.nextUrl.searchParams.get("batchId");
    const academicYear = req.nextUrl.searchParams.get("academicYear");
    const status = req.nextUrl.searchParams.get("status");
    const sortBy = req.nextUrl.searchParams.get("sortBy") || "createdAt";
    const sortOrder = req.nextUrl.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 25))
    );

    const where: Record<string, unknown> = {};

    if (session.scope !== "STATEWIDE" && session.scope !== "DISTRICT") {
      if (requestedInstId && requestedInstId !== session.institutionId) {
        await assertInstitutionScope(session, requestedInstId);
      }
      where.institutionId = session.institutionId!;
    } else if (requestedInstId && requestedInstId !== "ALL") {
      where.institutionId = requestedInstId;
    }

    if (universityId && universityId !== "ALL") where.universityId = universityId;
    if (district && district !== "ALL") where.institution = { district };
    if (academicYear && academicYear !== "ALL") where.academicYear = academicYear;
    if (status && status !== "ALL") where.status = status;
    if (batchId && batchId !== "ALL") where.enrollments = { some: { batchId } };
    if (courseId && courseId !== "ALL") where.enrollments = { some: { batch: { courseId } } };

    if (search) {
      where.OR = [
        { studentUid: { contains: search } },
        { universityRollNo: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { branch: { contains: search } },
      ];
    }

    const canViewSensitive = session.permissions.includes("students:sensitive");

    const allowedSort = new Set(["createdAt", "fullName", "studentUid", "universityRollNo"]);
    const orderField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [total, rawStudents] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          university: { select: { id: true, code: true, name: true } },
          institution: { select: { id: true, name: true, code: true, district: true } },
          enrollments: {
            include: {
              batch: {
                select: {
                  id: true,
                  batchCode: true,
                  name: true,
                  status: true,
                  course: { select: { id: true, code: true, title: true } },
                },
              },
            },
          },
          attendances: { select: { status: true } },
        },
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const students = rawStudents.map((s) => {
      const totalAtt = s.attendances.length;
      const presentAtt = s.attendances.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length;
      const attendancePercent = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
      const { attendances: _att, ...rest } = s;
      void _att;
      return {
        ...rest,
        attendancePercent,
        maskedIdentifier: canViewSensitive ? s.maskedIdentifier : undefined,
      };
    });

    return NextResponse.json({
      students,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
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
    const session = await requirePermission("students:manage");
    const body = await req.json();

    const institutionId =
      session.scope !== "STATEWIDE" && session.scope !== "DISTRICT"
        ? session.institutionId!
        : String(body.institutionId || "");

    const fullName = String(body.fullName || "").trim();
    const universityRollNo = String(body.universityRollNo || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const gender = String(body.gender || "Other").trim();
    const branch = String(body.branch || "").trim().toUpperCase();
    const yearOfStudy = Number(body.yearOfStudy || 3);

    if (!institutionId || !fullName || !universityRollNo || !email || !branch) {
      return NextResponse.json(
        { error: "Institution, full name, university roll no, email, and branch are required" },
        { status: 400 }
      );
    }

    await assertInstitutionScope(session, institutionId);

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: { university: true },
    });
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    // Configurable Student ID Generation Rule
    const patternCfg = await prisma.systemConfig.findUnique({
      where: { key: "STUDENT_ID_PATTERN" },
    });
    const pattern =
      patternCfg?.value ||
      "AP-{UNIVERSITY_CODE}-{INSTITUTION_CODE}-{YEAR}-{SEQUENCE}";

    const count = await prisma.student.count();
    const year = new Date().getFullYear().toString();
    const seq = String(count + 1).padStart(6, "0");
    const cleanInstCode = institution.code.replace(/[^A-Za-z0-9]/g, "");
    const cleanUnivCode = institution.university.code.replace(/[^A-Za-z0-9]/g, "");

    const studentUid = pattern
      .replace("{UNIVERSITY_CODE}", cleanUnivCode)
      .replace("{INSTITUTION_CODE}", cleanInstCode)
      .replace("{YEAR}", year)
      .replace("{SEQUENCE}", seq);

    const rawLast4 = String(body.aadhaarLast4 || "").replace(/\D/g, "").slice(-4);
    const maskedIdentifier = rawLast4.length === 4 ? `XXXX-XXXX-${rawLast4}` : null;

    const student = await prisma.student.create({
      data: {
        studentUid,
        universityId: institution.universityId,
        universityRollNo,
        institutionId,
        institutionStudentId: body.institutionStudentId
          ? String(body.institutionStudentId).trim()
          : null,
        maskedIdentifier,
        fullName,
        email,
        phone: phone || "9000000000",
        gender,
        dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth) : null,
        fatherName: String(body.fatherName || "").trim(),
        motherName: String(body.motherName || "").trim(),
        address: String(body.address || "").trim(),
        district: String(body.district || institution.district).trim(),
        mandal: String(body.mandal || institution.mandal || "").trim(),
        qualification: String(body.qualification || "B.Tech").trim(),
        branch,
        academicYear: String(body.academicYear || "2026-2027").trim(),
        yearOfStudy,
        graduationYear: Number(body.graduationYear || 2027),
        category: String(body.category || "General").trim(),
        status: "ACTIVE",
        createdBy: session.email,
      },
      include: {
        university: { select: { code: true, name: true } },
        institution: { select: { name: true, code: true } },
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId,
      action: "REGISTER_STUDENT",
      entityType: "Student",
      entityId: student.id,
      details: { studentUid, universityRollNo, fullName },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to register student (roll number or UID may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("students:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await assertInstitutionScope(session, existing.institutionId);

    // Note: studentUid is NEVER updated (immutable LMS Student ID)
    const data: Record<string, unknown> = { updatedBy: session.email };
    if (body.fullName !== undefined) data.fullName = String(body.fullName).trim();
    if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.branch !== undefined) data.branch = String(body.branch).trim().toUpperCase();
    if (body.yearOfStudy !== undefined) data.yearOfStudy = Number(body.yearOfStudy);
    if (body.status !== undefined) {
      const nextStatus = String(body.status).toUpperCase();
      assertValidTransition(STUDENT_TRANSITIONS, existing.status, nextStatus, "Student");
      data.status = nextStatus;
      data.isActive = nextStatus === "ACTIVE";
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
      data.isDeleted = !data.isActive;
      data.deletedAt = data.isActive ? null : new Date();
      data.deletedBy = data.isActive ? null : session.email;
      if (body.status === undefined) data.status = data.isActive ? "ACTIVE" : "INACTIVE";
    }

    const student = await prisma.student.update({ where: { id }, data });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: existing.institutionId,
      action:
        body.isActive === false
          ? "DEACTIVATE_STUDENT"
          : body.isActive === true
          ? "RESTORE_STUDENT"
          : "UPDATE_STUDENT",
      entityType: "Student",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}
