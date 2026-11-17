import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthError,
  logAudit,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAnyPermission(["courses:read", "courses:manage"]);

    if (session.scope === "STATEWIDE" || session.scope === "DISTRICT") {
      const courses = await prisma.course.findMany({
        include: {
          _count: { select: { batches: true, institutionCourses: true } },
        },
        orderBy: { code: "asc" },
      });
      return NextResponse.json({ courses });
    }

    // COLLEGE_ADMIN: strictly assigned courses only
    const assigned = await prisma.institutionCourse.findMany({
      where: { institutionId: session.institutionId! },
      include: {
        course: {
          include: {
            _count: {
              select: {
                batches: { where: { institutionId: session.institutionId! } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({
      courses: assigned
        .map((a) => a.course)
        .filter((c) => c.isActive),
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
    const session = await requirePermission("courses:manage");
    const body = await req.json();

    const code = String(body.code || "").trim().toUpperCase();
    const title = String(body.title || "").trim();
    const shortDescription = String(body.shortDescription || "").trim();
    const category = String(body.category || "Technical").trim();
    const sector = String(body.sector || "").trim();
    const durationHours = Number(body.durationHours || 120);
    const durationUnit = String(body.durationUnit || "Hours").trim();
    const level = String(body.level || "INTERMEDIATE").toUpperCase();
    const eligibility = String(body.eligibility || "Any Graduate / B.Tech / Diploma").trim();
    const learningOutcomes = String(body.learningOutcomes || "").trim();
    const assessmentMethod = String(body.assessmentMethod || "Project & Practical Assessment").trim();
    const certificateAvailable = body.certificateAvailable !== false;
    const status = String(body.status || "ACTIVE").toUpperCase();
    const description = String(body.description || "").trim();

    if (!code || !title || !sector) {
      return NextResponse.json(
        { error: "Course code, title, and sector are required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        code,
        title,
        shortDescription,
        category,
        sector,
        durationHours,
        durationUnit,
        level,
        eligibility,
        learningOutcomes,
        assessmentMethod,
        certificateAvailable,
        status,
        isActive: status === "ACTIVE",
        description,
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action: "CREATE_COURSE",
      entityType: "Course",
      entityId: course.id,
      details: { code, title, sector },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create course (code may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("courses:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Course id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.sector !== undefined) data.sector = String(body.sector).trim();
    if (body.durationHours !== undefined) data.durationHours = Number(body.durationHours);
    if (body.level !== undefined) data.level = String(body.level).toUpperCase();
    if (body.description !== undefined) data.description = String(body.description).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const course = await prisma.course.update({ where: { id }, data });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action:
        body.isActive === false
          ? "DEACTIVATE_COURSE"
          : body.isActive === true
          ? "RESTORE_COURSE"
          : "UPDATE_COURSE",
      entityType: "Course",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ course });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update course" }, { status: 400 });
  }
}
