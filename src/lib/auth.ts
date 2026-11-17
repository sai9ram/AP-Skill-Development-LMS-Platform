import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "ap_lms_session";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET || "ap-skill-development-lms-enterprise-2026-secret";
  return new TextEncoder().encode(secret);
}

export type Role = string;

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  scope: string;
  institutionId: string | null;
  mustChangePassword: boolean;
  permissions: string[];
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "permissions" | "scope">
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getJwtSecret());
}

export async function getUserRbacContext(
  userId: string,
  primaryRoleKey: string
): Promise<{ permissions: string[]; scope: string }> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId, role: { isActive: true } },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: { enabled: true },
            include: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  if (userRoles.length > 0) {
    const permSet = new Set<string>();
    let scope = "INSTITUTION";
    for (const ur of userRoles) {
      if (ur.role.scope === "STATEWIDE") scope = "STATEWIDE";
      else if (ur.role.scope === "DISTRICT" && scope !== "STATEWIDE") {
        scope = "DISTRICT";
      }
      for (const rp of ur.role.rolePermissions) {
        permSet.add(rp.permission.key);
      }
    }
    return { permissions: Array.from(permSet), scope };
  }

  // Fallback to primary role key in Role table
  const roleRecord = await prisma.role.findUnique({
    where: { key: primaryRoleKey },
    include: {
      rolePermissions: {
        where: { enabled: true },
        include: { permission: { select: { key: true } } },
      },
    },
  });

  if (!roleRecord || !roleRecord.isActive) {
    return { permissions: [], scope: "INSTITUTION" };
  }

  return {
    permissions: roleRecord.rolePermissions.map((rp) => rp.permission.key),
    scope: roleRecord.scope,
  };
}

export async function verifySessionToken(
  token: string
): Promise<Omit<SessionPayload, "permissions" | "scope"> | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      fullName: String(payload.fullName),
      role: String(payload.role),
      institutionId: payload.institutionId
        ? String(payload.institutionId)
        : null,
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = await verifySessionToken(token);
  if (!decoded) return null;

  // Verify user is still active in DB
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      institutionId: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user || !user.isActive) return null;

  const rbac = await getUserRbacContext(user.id, user.role);

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    scope: rbac.scope,
    institutionId: user.institutionId,
    mustChangePassword: user.mustChangePassword,
    permissions: rbac.permissions,
  };
}

export async function logAudit(params: {
  actorId?: string | null;
  actorRole: string;
  actorEmail: string;
  institutionId?: string | null;
  action: string;
  module?: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}) {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const hdrs = await headers();
      ipAddress = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "127.0.0.1";
      userAgent = hdrs.get("user-agent") || null;
    } catch {
      // Ignore outside request context
    }

    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorRole: params.actorRole,
        actorEmail: params.actorEmail,
        institutionId: params.institutionId ?? null,
        action: params.action,
        module: params.module ?? params.entityType,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        ipAddress,
        userAgent,
        detailsJson: JSON.stringify(params.details ?? {}),
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(
  allowedRoles?: Role[],
  allowPendingPasswordChange = false
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Authentication required", 401);
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "UNAUTHORIZED_ROLE_ACCESS",
      entityType: "Security",
      details: { requiredRoles: allowedRoles },
    });
    throw new AuthError("Forbidden: insufficient role permissions", 403);
  }
  if (!allowPendingPasswordChange && session.mustChangePassword) {
    throw new AuthError(
      "Password change required before accessing workspace",
      403
    );
  }
  if (session.scope === "INSTITUTION" && !session.institutionId) {
    throw new AuthError("Institution-scoped user is not bound to an institution", 403);
  }
  return session;
}

export async function requirePermission(
  requiredPermission: string
): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.permissions.includes(requiredPermission)) {
    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "UNAUTHORIZED_PERMISSION_ACCESS",
      entityType: "Security",
      details: { requiredPermission, userPermissions: session.permissions },
    });
    throw new AuthError(
      `Forbidden: missing required permission (${requiredPermission})`,
      403
    );
  }
  return session;
}

export async function requireAnyPermission(
  requiredPermissions: string[]
): Promise<SessionPayload> {
  const session = await requireSession();
  const hasAny = requiredPermissions.some((p) =>
    session.permissions.includes(p)
  );
  if (!hasAny) {
    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "UNAUTHORIZED_PERMISSION_ACCESS",
      entityType: "Security",
      details: { requiredAnyOf: requiredPermissions },
    });
    throw new AuthError("Forbidden: insufficient permissions", 403);
  }
  return session;
}

export async function assertInstitutionScope(
  session: SessionPayload,
  targetInstitutionId: string
): Promise<void> {
  if (session.scope === "STATEWIDE" || session.scope === "DISTRICT") return;
  if (session.institutionId !== targetInstitutionId) {
    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "CROSS_INSTITUTION_ACCESS_DENIED",
      entityType: "Security",
      entityId: targetInstitutionId,
      details: {
        attemptedInstitutionId: targetInstitutionId,
        ownInstitutionId: session.institutionId,
      },
    });
    throw new AuthError(
      "Forbidden: cannot access another institution's data",
      403
    );
  }
}
