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
    const session = await requireAnyPermission(["trainers:read", "trainers:manage"]);

    if (session.scope === "STATEWIDE" || session.scope === "DISTRICT") {
      const trainers = await prisma.trainer.findMany({
        include: { _count: { select: { batches: true } } },
        orderBy: { trainerCode: "asc" },
      });
      return NextResponse.json({ trainers });
    }

    // COLLEGE_ADMIN: strictly trainers assigned to this institution's batches
    const batches = await prisma.batch.findMany({
      where: {
        institutionId: session.institutionId!,
        trainerId: { not: null },
      },
      include: {
        trainer: true,
        course: { select: { code: true, title: true } },
      },
    });

    const trainerMap = new Map<string, unknown>();
    for (const b of batches) {
      if (b.trainer && b.trainer.isActive) {
        if (!trainerMap.has(b.trainer.id)) {
          trainerMap.set(b.trainer.id, {
            ...b.trainer,
            assignedBatches: [{ batchCode: b.batchCode, name: b.name, course: b.course }],
          });
        } else {
          const existing = trainerMap.get(b.trainer.id) as {
            assignedBatches: Array<unknown>;
          };
          existing.assignedBatches.push({
            batchCode: b.batchCode,
            name: b.name,
            course: b.course,
          });
        }
      }
    }

    return NextResponse.json({ trainers: Array.from(trainerMap.values()) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("trainers:manage");
    const body = await req.json();

    const trainerCode = String(body.trainerCode || "").trim().toUpperCase();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const specialization = String(body.specialization || "").trim();
    const qualification = String(body.qualification || "").trim();
    const experience = Number(body.experience || 3);
    const certification = String(body.certification || "").trim();
    const documentsNote = String(body.documentsNote || "").trim();
    const status = String(body.status || "ACTIVE").toUpperCase();

    if (!trainerCode || !fullName || !email || !specialization) {
      return NextResponse.json(
        { error: "Trainer code, full name, email, and specialization are required" },
        { status: 400 }
      );
    }

    const trainer = await prisma.trainer.create({
      data: {
        trainerCode,
        fullName,
        email,
        phone: phone || "9900000000",
        specialization,
        qualification: qualification || "B.Tech / Certified Trainer",
        experience,
        certification,
        documentsNote,
        status,
        isActive: status === "ACTIVE",
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action: "CREATE_TRAINER",
      entityType: "Trainer",
      entityId: trainer.id,
      details: { trainerCode, fullName, specialization },
    });

    return NextResponse.json({ trainer }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create trainer (code or email may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("trainers:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Trainer id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.fullName !== undefined) data.fullName = String(body.fullName).trim();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.specialization !== undefined)
      data.specialization = String(body.specialization).trim();
    if (body.qualification !== undefined)
      data.qualification = String(body.qualification).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const trainer = await prisma.trainer.update({ where: { id }, data });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      action:
        body.isActive === false
          ? "DEACTIVATE_TRAINER"
          : body.isActive === true
          ? "RESTORE_TRAINER"
          : "UPDATE_TRAINER",
      entityType: "Trainer",
      entityId: id,
      details: data,
    });

    return NextResponse.json({ trainer });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update trainer" }, { status: 400 });
  }
}
