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
    await requireAnyPermission(["governance:manage", "audit:read"]);
    const [configs, permissions, auditLogs] = await Promise.all([
      prisma.systemConfig.findMany({ orderBy: { category: "asc" } }),
      prisma.rolePermission.findMany({
        include: {
          role: { select: { id: true, key: true, name: true } },
          permission: { select: { id: true, key: true, label: true, module: true } },
        },
        orderBy: [{ role: { hierarchyLevel: "asc" } }, { permission: { module: "asc" } }],
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { institution: { select: { name: true, code: true } } },
      }),
    ]);
    return NextResponse.json({ configs, permissions, auditLogs });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("governance:manage");
    const body = await req.json();

    if (body.type === "CONFIG") {
      const key = String(body.key || "");
      const value = String(body.value ?? "");
      const updated = await prisma.systemConfig.update({
        where: { key },
        data: { value, updatedBy: session.email },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "UPDATE_SYSTEM_CONFIG",
        entityType: "SystemConfig",
        entityId: updated.id,
        details: { key, value },
      });
      return NextResponse.json({ config: updated });
    }

    if (body.type === "PERMISSION") {
      const id = String(body.id || "");
      const enabled = Boolean(body.enabled);
      const updated = await prisma.rolePermission.update({
        where: { id },
        data: { enabled },
        include: { role: true, permission: true },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "UPDATE_ROLE_PERMISSION",
        entityType: "RolePermission",
        entityId: id,
        details: {
          roleKey: updated.role.key,
          permissionKey: updated.permission.key,
          enabled,
        },
      });
      return NextResponse.json({ permission: updated });
    }

    return NextResponse.json({ error: "Invalid governance update type" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update governance setting" }, { status: 400 });
  }
}
