import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireSession } from "@/lib/auth";

function buildMatcher(q: string, mode: string) {
  if (mode === "exact") return { equals: q };
  if (mode === "prefix") return { startsWith: q };
  return { contains: q };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const mode = req.nextUrl.searchParams.get("mode") || "contains";
    const entity = req.nextUrl.searchParams.get("entity") || "ALL";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 25))
    );

    if (q.length < 2) {
      return NextResponse.json({
        institutions: [],
        universities: [],
        students: [],
        courses: [],
        trainers: [],
        batches: [],
        admins: [],
        pagination: { page, pageSize },
      });
    }

    const matcher = buildMatcher(q, mode);
    const skip = (page - 1) * pageSize;

    if (session.permissions.includes("search:global") || session.scope === "STATEWIDE") {
      const [
        institutions,
        universities,
        students,
        courses,
        trainers,
        batches,
        admins,
      ] = await Promise.all([
        entity === "ALL" || entity === "INSTITUTION"
          ? prisma.institution.findMany({
              where: {
                OR: [
                  { name: matcher },
                  { code: matcher },
                  { district: matcher },
                  { city: matcher },
                ],
              },
              include: { university: { select: { code: true, name: true } } },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "UNIVERSITY"
          ? prisma.university.findMany({
              where: { OR: [{ name: matcher }, { code: matcher }, { district: matcher }] },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "STUDENT"
          ? prisma.student.findMany({
              where: {
                OR: [
                  { studentUid: matcher },
                  { universityRollNo: matcher },
                  { fullName: matcher },
                  { phone: matcher },
                  { email: matcher },
                ],
              },
              include: {
                university: { select: { code: true, name: true } },
                institution: { select: { name: true, code: true, district: true } },
                enrollments: {
                  include: {
                    batch: {
                      select: {
                        batchCode: true,
                        name: true,
                        status: true,
                        course: { select: { code: true, title: true } },
                      },
                    },
                  },
                },
              },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "COURSE"
          ? prisma.course.findMany({
              where: { OR: [{ title: matcher }, { code: matcher }, { sector: matcher }] },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "TRAINER"
          ? prisma.trainer.findMany({
              where: {
                OR: [
                  { fullName: matcher },
                  { trainerCode: matcher },
                  { specialization: matcher },
                  { phone: matcher },
                ],
              },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "BATCH"
          ? prisma.batch.findMany({
              where: { OR: [{ name: matcher }, { batchCode: matcher }] },
              include: {
                institution: { select: { name: true, code: true } },
                course: { select: { code: true, title: true } },
              },
              skip,
              take: pageSize,
            })
          : [],
        entity === "ALL" || entity === "ADMIN"
          ? prisma.user.findMany({
              where: {
                role: "COLLEGE_ADMIN",
                OR: [{ fullName: matcher }, { username: matcher }, { email: matcher }],
              },
              select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                isActive: true,
                institution: { select: { code: true, name: true } },
              },
              skip,
              take: pageSize,
            })
          : [],
      ]);

      const canViewSensitive = session.permissions.includes("students:sensitive");
      const safeStudents = students.map((s) => ({
        ...s,
        maskedIdentifier: canViewSensitive ? s.maskedIdentifier : undefined,
      }));

      return NextResponse.json({
        institutions,
        universities,
        students: safeStudents,
        courses,
        trainers,
        batches,
        admins,
        pagination: { page, pageSize },
      });
    }

    // Institution-scoped search
    const instId = session.institutionId!;
    const [students, batches, assignedCourses] = await Promise.all([
      prisma.student.findMany({
        where: {
          institutionId: instId,
          OR: [
            { fullName: matcher },
            { studentUid: matcher },
            { universityRollNo: matcher },
            { phone: matcher },
            { email: matcher },
          ],
        },
        include: {
          university: { select: { code: true, name: true } },
          institution: { select: { name: true, code: true } },
          enrollments: {
            include: {
              batch: {
                select: {
                  batchCode: true,
                  name: true,
                  course: { select: { code: true, title: true } },
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.batch.findMany({
        where: {
          institutionId: instId,
          OR: [{ name: matcher }, { batchCode: matcher }],
        },
        skip,
        take: pageSize,
      }),
      prisma.institutionCourse.findMany({
        where: {
          institutionId: instId,
          course: { OR: [{ title: matcher }, { code: matcher }] },
        },
        include: { course: true },
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      institutions: [],
      universities: [],
      students: students.map((s) => ({ ...s, maskedIdentifier: undefined })),
      courses: assignedCourses.map((ic) => ic.course),
      trainers: [],
      batches,
      admins: [],
      pagination: { page, pageSize },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
