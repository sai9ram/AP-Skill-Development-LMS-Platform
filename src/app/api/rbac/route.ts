import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, logAudit, requirePermission } from "@/lib/auth";

export async function GET() {
  try {
    await requirePermission("governance:manage");

    const [roles, permissions, users] = await Promise.all([
      prisma.role.findMany({
        include: {
          rolePermissions: {
            include: { permission: { select: { id: true, key: true, label: true, module: true } } },
          },
          _count: { select: { userRoles: true } },
        },
        orderBy: [{ hierarchyLevel: "asc" }, { name: "asc" }],
      }),
      prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { key: "asc" }],
      }),
      prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          institution: { select: { code: true, name: true } },
          userRoles: {
            include: { role: { select: { id: true, key: true, name: true, scope: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ roles, permissions, users });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("governance:manage");
    const body = await req.json();

    if (body.action === "CREATE_ROLE") {
      const key = String(body.key || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_");
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const scope = String(body.scope || "INSTITUTION").toUpperCase();
      const hierarchyLevel = Number(body.hierarchyLevel || 4);
      const permissionIds: string[] = Array.isArray(body.permissionIds)
        ? body.permissionIds
        : [];

      if (!key || !name) {
        return NextResponse.json(
          { error: "Role key and name are required" },
          { status: 400 }
        );
      }

      const role = await prisma.role.create({
        data: { key, name, description, scope, hierarchyLevel, isSystem: false },
      });

      for (const permissionId of permissionIds) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId, enabled: true },
        });
      }

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "CREATE_RBAC_ROLE",
        entityType: "Role",
        entityId: role.id,
        details: { key, name, scope, hierarchyLevel, permissionCount: permissionIds.length },
      });

      return NextResponse.json({ role }, { status: 201 });
    }

    if (body.action === "ASSIGN_USER_ROLE") {
      const userId = String(body.userId || "");
      const roleId = String(body.roleId || "");
      if (!userId || !roleId) {
        return NextResponse.json({ error: "userId and roleId are required" }, { status: 400 });
      }

      const userRole = await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: { assignedBy: session.email },
        create: { userId, roleId, assignedBy: session.email },
        include: { role: true, user: { select: { email: true } } },
      });

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "ASSIGN_USER_ROLE",
        entityType: "UserRole",
        entityId: userRole.id,
        details: { userEmail: userRole.user.email, roleKey: userRole.role.key },
      });

      return NextResponse.json({ userRole }, { status: 201 });
    }

    if (body.action === "REVOKE_USER_ROLE") {
      const userId = String(body.userId || "");
      const roleId = String(body.roleId || "");
      await prisma.userRole.delete({
        where: { userId_roleId: { userId, roleId } },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "REVOKE_USER_ROLE",
        entityType: "UserRole",
        details: { userId, roleId },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid RBAC action" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to execute RBAC action" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("governance:manage");
    const body = await req.json();

    if (body.action === "TOGGLE_ROLE_PERMISSION") {
      const roleId = String(body.roleId || "");
      const permissionId = String(body.permissionId || "");
      const enabled = Boolean(body.enabled);

      const rp = await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: { enabled },
        create: { roleId, permissionId, enabled },
        include: { role: true, permission: true },
      });

      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: "TOGGLE_ROLE_PERMISSION",
        entityType: "RolePermission",
        entityId: rp.id,
        details: { roleKey: rp.role.key, permissionKey: rp.permission.key, enabled },
      });

      return NextResponse.json({ rolePermission: rp });
    }

    if (body.action === "TOGGLE_ROLE_ACTIVE") {
      const roleId = String(body.roleId || "");
      const existing = await prisma.role.findUnique({ where: { id: roleId } });
      if (!existing) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (existing.isSystem) {
        return NextResponse.json(
          { error: "System roles (SUPER_ADMIN, COLLEGE_ADMIN) cannot be deactivated" },
          { status: 400 }
        );
      }
      const updated = await prisma.role.update({
        where: { id: roleId },
        data: { isActive: !existing.isActive },
      });
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        action: updated.isActive ? "RESTORE_RBAC_ROLE" : "DEACTIVATE_RBAC_ROLE",
        entityType: "Role",
        entityId: roleId,
        details: { key: updated.key, isActive: updated.isActive },
      });
      return NextResponse.json({ role: updated });
    }

    return NextResponse.json({ error: "Invalid RBAC PATCH action" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update RBAC" }, { status: 400 });
  }
}
