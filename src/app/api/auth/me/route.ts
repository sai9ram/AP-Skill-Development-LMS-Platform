import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      phone: true,
      designation: true,
      institutionId: true,
      mustChangePassword: true,
      lastLoginAt: true,
      institution: {
        select: {
          id: true,
          name: true,
          code: true,
          district: true,
          city: true,
          principalName: true,
          university: { select: { name: true, code: true } },
        },
      },
      userRoles: {
        include: {
          role: { select: { id: true, key: true, name: true, scope: true, hierarchyLevel: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...user,
      scope: session.scope,
    },
    permissions: session.permissions,
  });
}
