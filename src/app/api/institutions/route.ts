import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthError,
  logAudit,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";
import { handleApiError } from "@/lib/apiError";
import { assertValidTransition, INSTITUTION_TRANSITIONS } from "@/lib/workflows";

export async function GET(req: NextRequest) {
  try {
    await requireAnyPermission(["institutions:read", "institutions:manage"]);
    const search = (req.nextUrl.searchParams.get("search") || "").trim();
    const district = (req.nextUrl.searchParams.get("district") || "").trim();
    const status = req.nextUrl.searchParams.get("status") || "all";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { city: { contains: search } },
      ];
    }
    if (district && district !== "ALL") {
      where.district = district;
    }
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    const institutions = await prisma.institution.findMany({
      where,
      include: {
        university: { select: { id: true, name: true, code: true } },
        institutionCourses: {
          include: { course: { select: { id: true, code: true, title: true } } },
        },
        _count: {
          select: { students: true, batches: true, admins: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ institutions });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("institutions:manage");
    const body = await req.json();

    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase();
    const universityId = String(body.universityId || "");
    const district = String(body.district || "").trim();
    const city = String(body.city || "").trim();
    const address = String(body.address || "").trim();
    const principalName = String(body.principalName || "").trim();
    const contactEmail = String(body.contactEmail || "").trim();
    const contactMobile = String(body.contactMobile || body.contactPhone || "").trim();
    const institutionType = String(body.institutionType || "Engineering College").trim();
    const mandal = String(body.mandal || "").trim();
    const pincode = String(body.pincode || "").trim();
    const contactPerson = String(body.contactPerson || "").trim();
    const principalMobile = String(body.principalMobile || "").trim();
    const status = String(body.status || "ACTIVE").toUpperCase();

    if (!name || !code || !universityId || !district || !city) {
      return NextResponse.json(
        { error: "Name, code, university, district, and city are required" },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        code,
        universityId,
        institutionType,
        district,
        mandal,
        city,
        address: address || `${city}, ${district}, Andhra Pradesh`,
        pincode,
        contactPerson,
        contactMobile: contactMobile || "0863-0000000",
        contactEmail: contactEmail || `info@${code.toLowerCase()}.edu.in`,
        principalName: principalName || "Principal",
        principalMobile,
        status,
        isActive: status === "ACTIVE",
        createdBy: session.email,
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: institution.id,
      action: "CREATE_INSTITUTION",
      entityType: "Institution",
      entityId: institution.id,
      details: { name, code, district },
    });

    return NextResponse.json({ institution }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create institution (code may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("institutions:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json(
        { error: "Institution id is required" },
        { status: 400 }
      );
    }

    // Optional: assign/unassign course to institution
    if (body.assignCourseId) {
      await prisma.institutionCourse.upsert({
        where: {
          institutionId_courseId: {
            institutionId: id,
            courseId: String(body.assignCourseId),
          },
        },
        update: {},
        create: {
          institutionId: id,
          courseId: String(body.assignCourseId),
        },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: id,
        action: "ASSIGN_COURSE_TO_INSTITUTION",
        entityType: "InstitutionCourse",
        entityId: id,
        details: { courseId: body.assignCourseId },
      });
      return NextResponse.json({ ok: true });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.district !== undefined) data.district = String(body.district).trim();
    if (body.city !== undefined) data.city = String(body.city).trim();
    if (body.principalName !== undefined)
      data.principalName = String(body.principalName).trim();
    if (body.contactEmail !== undefined)
      data.contactEmail = String(body.contactEmail).trim();
    if (body.contactMobile !== undefined || body.contactPhone !== undefined)
      data.contactMobile = String(body.contactMobile ?? body.contactPhone).trim();
    if (body.institutionType !== undefined)
      data.institutionType = String(body.institutionType).trim();
    if (body.mandal !== undefined) data.mandal = String(body.mandal).trim();
    if (body.pincode !== undefined) data.pincode = String(body.pincode).trim();
    if (body.contactPerson !== undefined)
      data.contactPerson = String(body.contactPerson).trim();
    if (body.principalMobile !== undefined)
      data.principalMobile = String(body.principalMobile).trim();
    if (body.status !== undefined) {
      const nextStatus = String(body.status).toUpperCase();
      const existingInst = await prisma.institution.findUnique({ where: { id }, select: { status: true } });
      if (existingInst) {
        assertValidTransition(INSTITUTION_TRANSITIONS, existingInst.status, nextStatus, "Institution");
      }
      data.status = nextStatus;
      data.isActive = nextStatus === "ACTIVE";
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
      data.isDeleted = !data.isActive;
      data.deletedAt = data.isActive ? null : new Date();
      data.deletedBy = data.isActive ? null : session.email;
      if (body.status === undefined) {
        data.status = data.isActive ? "ACTIVE" : "INACTIVE";
      }
    }
    data.updatedBy = session.email;

    const institution = await prisma.institution.update({
      where: { id },
      data,
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: id,
      action:
        body.isActive === false
          ? "DEACTIVATE_INSTITUTION"
          : body.isActive === true
          ? "RESTORE_INSTITUTION"
          : "UPDATE_INSTITUTION",
      entityType: "Institution",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ institution });
  } catch (err) {
    return handleApiError(err);
  }
}
