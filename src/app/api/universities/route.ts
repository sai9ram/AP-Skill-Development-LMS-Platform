import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, logAudit, requirePermission } from "@/lib/auth";

export async function GET() {
  try {
    await requirePermission("universities:manage");
    const universities = await prisma.university.findMany({
      include: { _count: { select: { institutions: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ universities });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("universities:manage");
    const body = await req.json();
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase();
    const universityType = String(body.universityType || "State University").trim();
    const district = String(body.district || "").trim();
    const state = String(body.state || "Andhra Pradesh").trim();
    const status = String(body.status || "ACTIVE").toUpperCase();

    if (!name || !code || !district) {
      return NextResponse.json(
        { error: "Name, code, and district are required" },
        { status: 400 }
      );
    }

    const university = await prisma.university.create({
      data: {
        name,
        code,
        universityType,
        district,
        state,
        status,
        isActive: status === "ACTIVE",
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action: "CREATE_UNIVERSITY",
      entityType: "University",
      entityId: university.id,
      details: { name, code, district },
    });

    return NextResponse.json({ university }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to create university (code may already exist)" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("universities:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "University id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.universityType !== undefined) data.universityType = String(body.universityType).trim();
    if (body.district !== undefined) data.district = String(body.district).trim();
    if (body.state !== undefined) data.state = String(body.state).trim();
    if (body.status !== undefined) {
      data.status = String(body.status).toUpperCase();
      data.isActive = data.status === "ACTIVE";
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
      data.isDeleted = !data.isActive;
      data.deletedAt = data.isActive ? null : new Date();
      data.deletedBy = data.isActive ? null : session.email;
      if (body.status === undefined) data.status = data.isActive ? "ACTIVE" : "INACTIVE";
    }

    const university = await prisma.university.update({
      where: { id },
      data,
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action: body.isActive === false ? "DEACTIVATE_UNIVERSITY" : body.isActive === true ? "RESTORE_UNIVERSITY" : "UPDATE_UNIVERSITY",
      entityType: "University",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ university });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update university" }, { status: 400 });
  }
}
