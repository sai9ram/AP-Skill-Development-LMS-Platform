import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AuthError, hashPassword, logAudit, requirePermission } from "@/lib/auth";

function generateSecureTempPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!";
  const all = upper + lower + digits + symbols;

  const bytes = crypto.randomBytes(length);
  const chars = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  for (let i = 4; i < length; i++) {
    chars.push(all[bytes[i] % all.length]);
  }
  return chars.sort(() => (crypto.randomBytes(1)[0] % 2 === 0 ? 1 : -1)).join("");
}

export async function GET() {
  try {
    await requirePermission("admins:manage");
    const admins = await prisma.user.findMany({
      where: { role: "COLLEGE_ADMIN" },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        designation: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        institutionId: true,
        institution: { select: { id: true, name: true, code: true, district: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ admins });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("admins:manage");
    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const institutionId = String(body.institutionId || "");
    const phone = body.phone ? String(body.phone).trim() : null;
    const designation = String(body.designation || "College Skill Coordinator").trim();
    const activateImmediately = body.activateImmediately !== false;

    if (!fullName || !email || !institutionId) {
      return NextResponse.json(
        { error: "Full name, official email, and institution are required" },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      return NextResponse.json({ error: "Selected institution not found" }, { status: 404 });
    }

    // Generate Admin Username: ADM-<INSTITUTION_CODE> (or suffix if multiple)
    let username = String(body.username || "").trim().toUpperCase();
    if (!username) {
      const existingCount = await prisma.user.count({
        where: { institutionId, role: "COLLEGE_ADMIN" },
      });
      username =
        existingCount === 0
          ? `ADM-${institution.code}`
          : `ADM-${institution.code}-${existingCount + 1}`;
    }

    const tempPassword =
      body.tempPassword && String(body.tempPassword).length >= 8
        ? String(body.tempPassword)
        : generateSecureTempPassword(12);

    const passwordHash = await hashPassword(tempPassword);

    const admin = await prisma.user.create({
      data: {
        username,
        fullName,
        email,
        passwordHash,
        role: "COLLEGE_ADMIN",
        institutionId,
        phone,
        designation,
        isActive: activateImmediately,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        institutionId: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Link normalized UserRole
    const collegeAdminRole = await prisma.role.findUnique({
      where: { key: "COLLEGE_ADMIN" },
    });
    if (collegeAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: admin.id,
          roleId: collegeAdminRole.id,
          assignedBy: session.email,
        },
      });
    }

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId,
      action: "CREATE_COLLEGE_ADMIN",
      entityType: "User",
      entityId: admin.id,
      details: {
        username,
        email,
        institutionCode: institution.code,
        isActive: activateImmediately,
        mustChangePassword: true,
      },
    });

    return NextResponse.json(
      {
        admin,
        credentials: {
          username,
          tempPassword,
          institutionCode: institution.code,
          institutionName: institution.name,
          accountStatus: activateImmediately ? "ACTIVE" : "PENDING_ACTIVATION",
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create College Admin (email or username may already exist)" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("admins:manage");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Admin id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.fullName !== undefined) data.fullName = String(body.fullName).trim();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.designation !== undefined) data.designation = String(body.designation).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    let generatedTempPassword: string | undefined;
    if (body.resetTempPassword) {
      const newPass =
        typeof body.resetTempPassword === "string" && body.resetTempPassword.length >= 8
          ? body.resetTempPassword
          : generateSecureTempPassword(12);
      generatedTempPassword = newPass;
      data.passwordHash = await hashPassword(newPass);
      data.mustChangePassword = true;
    }

    const admin = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        institutionId: true,
        institution: { select: { code: true, name: true } },
      },
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: admin.institutionId,
      action: body.resetTempPassword
        ? "RESET_ADMIN_TEMP_PASSWORD"
        : body.isActive === true
        ? "ACTIVATE_COLLEGE_ADMIN"
        : body.isActive === false
        ? "DEACTIVATE_COLLEGE_ADMIN"
        : "UPDATE_COLLEGE_ADMIN",
      entityType: "User",
      entityId: id,
      details: { username: admin.username, email: admin.email },
    });

    return NextResponse.json({
      admin,
      ...(generatedTempPassword ? { tempPassword: generatedTempPassword } : {}),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update College Admin" }, { status: 400 });
  }
}
