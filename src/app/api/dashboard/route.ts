import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();

    if (session.scope === "STATEWIDE" || session.scope === "DISTRICT") {
      const sp = req.nextUrl.searchParams;
      const district = sp.get("district") || "";
      const universityId = sp.get("universityId") || "";
      const institutionId = sp.get("institutionId") || "";
      const courseId = sp.get("courseId") || "";
      const batchId = sp.get("batchId") || "";
      const trainerId = sp.get("trainerId") || "";
      const gender = sp.get("gender") || "";
      const academicYear = sp.get("academicYear") || "";
      const trainingStatus = sp.get("trainingStatus") || "";

      const instWhere: Record<string, unknown> = {};
      if (district && district !== "ALL") instWhere.district = district;
      if (universityId && universityId !== "ALL") instWhere.universityId = universityId;
      if (institutionId && institutionId !== "ALL") instWhere.id = institutionId;

      const studentWhere: Record<string, unknown> = {};
      if (district && district !== "ALL") studentWhere.institution = { district };
      if (universityId && universityId !== "ALL") studentWhere.universityId = universityId;
      if (institutionId && institutionId !== "ALL") studentWhere.institutionId = institutionId;
      if (gender && gender !== "ALL") studentWhere.gender = gender;
      if (academicYear && academicYear !== "ALL") studentWhere.academicYear = academicYear;

      const batchWhere: Record<string, unknown> = {};
      if (district && district !== "ALL") batchWhere.institution = { district };
      if (universityId && universityId !== "ALL") batchWhere.institution = { ...(batchWhere.institution as object || {}), universityId };
      if (institutionId && institutionId !== "ALL") batchWhere.institutionId = institutionId;
      if (courseId && courseId !== "ALL") batchWhere.courseId = courseId;
      if (batchId && batchId !== "ALL") batchWhere.id = batchId;
      if (trainerId && trainerId !== "ALL") batchWhere.trainerId = trainerId;
      if (trainingStatus && trainingStatus !== "ALL") batchWhere.status = trainingStatus;

      const [
        allUniversities,
        allInstitutions,
        filteredInstitutions,
        collegeAdmins,
        filteredStudents,
        allCourses,
        allTrainers,
        filteredBatches,
        filteredEnrollments,
        filteredAttendances,
        filteredCertificates,
        recentAudits,
      ] = await Promise.all([
        prisma.university.findMany({ where: { isDeleted: false }, orderBy: { code: "asc" } }),
        prisma.institution.findMany({
          where: { isDeleted: false },
          select: { id: true, code: true, name: true, district: true, universityId: true },
          orderBy: { name: "asc" },
        }),
        prisma.institution.findMany({
          where: instWhere,
          include: {
            university: { select: { code: true, name: true } },
            _count: {
              select: {
                students: true,
                batches: true,
                admins: true,
                institutionCourses: true,
                enrollments: true,
              },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.user.count({
          where: {
            role: "COLLEGE_ADMIN",
            isDeleted: false,
            ...(institutionId && institutionId !== "ALL" ? { institutionId } : {}),
            ...(district && district !== "ALL" ? { institution: { district } } : {}),
          },
        }),
        prisma.student.findMany({
          where: studentWhere,
          select: {
            id: true,
            isActive: true,
            district: true,
            universityId: true,
            institutionId: true,
            university: { select: { code: true } },
            institution: { select: { district: true } },
          },
        }),
        prisma.course.findMany({ where: { isDeleted: false }, orderBy: { code: "asc" } }),
        prisma.trainer.findMany({ where: { isDeleted: false }, orderBy: { trainerCode: "asc" } }),
        prisma.batch.findMany({
          where: batchWhere,
          include: {
            course: { select: { id: true, code: true, title: true } },
            trainer: { select: { id: true, trainerCode: true, fullName: true } },
            institution: { select: { id: true, code: true, name: true, district: true } },
            _count: { select: { enrollments: true } },
          },
        }),
        prisma.batchEnrollment.findMany({
          where: { batch: batchWhere },
          select: { status: true, completionStatus: true, progressPercent: true, courseId: true, institutionId: true },
        }),
        prisma.attendance.findMany({
          where: { batch: batchWhere },
          select: { date: true, status: true, batchId: true },
        }),
        prisma.certificate.findMany({
          where: {
            ...(institutionId && institutionId !== "ALL" ? { institutionId } : {}),
            ...(courseId && courseId !== "ALL" ? { courseId } : {}),
            ...(batchId && batchId !== "ALL" ? { batchId } : {}),
            ...(district && district !== "ALL" ? { institution: { district } } : {}),
          },
          select: { status: true },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 15,
        }),
      ]);

      const attendanceTotal = filteredAttendances.length;
      const attendancePresent = filteredAttendances.filter((a) =>
        ["PRESENT", "LATE"].includes(a.status)
      ).length;
      const attendanceRate =
        attendanceTotal > 0
          ? Math.round((attendancePresent / attendanceTotal) * 100)
          : 0;

      // District-wise aggregations
      const distInstMap = new Map<string, number>();
      for (const i of filteredInstitutions) {
        distInstMap.set(i.district, (distInstMap.get(i.district) || 0) + 1);
      }
      const distStuMap = new Map<string, number>();
      const univStuMap = new Map<string, number>();
      for (const s of filteredStudents) {
        const d = s.institution?.district || s.district || "Unknown";
        distStuMap.set(d, (distStuMap.get(d) || 0) + 1);
        const uCode = s.university?.code || "Other";
        univStuMap.set(uCode, (univStuMap.get(uCode) || 0) + 1);
      }

      // Course popularity
      const coursePopMap = new Map<string, { code: string; title: string; count: number }>();
      for (const b of filteredBatches) {
        const cur = coursePopMap.get(b.courseId) || {
          code: b.course.code,
          title: b.course.title,
          count: 0,
        };
        cur.count += b._count.enrollments;
        coursePopMap.set(b.courseId, cur);
      }

      // Batch status counts
      const batchStatusMap = new Map<string, number>();
      for (const b of filteredBatches) {
        batchStatusMap.set(b.status, (batchStatusMap.get(b.status) || 0) + 1);
      }

      // Trainer allocation
      const trainerAllocMap = new Map<string, { name: string; code: string; batches: number }>();
      for (const b of filteredBatches) {
        if (b.trainer) {
          const cur = trainerAllocMap.get(b.trainer.id) || {
            name: b.trainer.fullName,
            code: b.trainer.trainerCode,
            batches: 0,
          };
          cur.batches += 1;
          trainerAllocMap.set(b.trainer.id, cur);
        }
      }

      // Attendance trends
      const attDateMap = new Map<string, { total: number; present: number }>();
      for (const a of filteredAttendances) {
        const cur = attDateMap.get(a.date) || { total: 0, present: 0 };
        cur.total += 1;
        if (["PRESENT", "LATE"].includes(a.status)) cur.present += 1;
        attDateMap.set(a.date, cur);
      }
      const attendanceTrends = Array.from(attDateMap.entries())
        .sort(([d1], [d2]) => d1.localeCompare(d2))
        .slice(-7)
        .map(([date, val]) => ({
          date,
          rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
        }));

      // Completion trends
      const completedEnrollments = filteredEnrollments.filter(
        (e) => e.completionStatus === "COMPLETED" || e.status === "COMPLETED"
      ).length;
      const inProgressEnrollments = filteredEnrollments.length - completedEnrollments;

      // Certificate stats
      const certStats = {
        total: filteredCertificates.length,
        issued: filteredCertificates.filter((c) => c.status === "ISSUED").length,
        pending: filteredCertificates.filter((c) => c.status === "PENDING").length,
        revoked: filteredCertificates.filter((c) => c.status === "REVOKED").length,
      };

      // Alerts & Exceptions
      const alerts: Array<{ severity: string; message: string }> = [];
      const unassignedBatches = filteredBatches.filter((b) => !b.trainer);
      if (unassignedBatches.length > 0) {
        alerts.push({
          severity: "HIGH",
          message: `${unassignedBatches.length} batch(es) do not have an assigned trainer.`,
        });
      }
      const noBatchInsts = filteredInstitutions.filter((i) => i._count.batches === 0);
      if (noBatchInsts.length > 0) {
        alerts.push({
          severity: "MEDIUM",
          message: `${noBatchInsts.length} affiliated institution(s) have 0 active training batches.`,
        });
      }
      if (attendanceTotal > 0 && attendanceRate < 75) {
        alerts.push({
          severity: "HIGH",
          message: `Filtered attendance rate (${attendanceRate}%) is below the 75% compliance threshold.`,
        });
      }

      const uniqueDistricts = Array.from(
        new Set(allInstitutions.map((i) => i.district))
      ).sort();

      return NextResponse.json({
        scope: "STATEWIDE",
        stats: {
          totalUniversities: allUniversities.length,
          totalInstitutions: filteredInstitutions.length,
          activeInstitutions: filteredInstitutions.filter((i) => i.isActive).length,
          collegeAdmins,
          totalStudents: filteredStudents.length,
          activeStudents: filteredStudents.filter((s) => s.isActive).length,
          totalCourses: allCourses.length,
          activeCourses: allCourses.filter((c) => c.isActive).length,
          totalTrainers: allTrainers.length,
          activeBatches: filteredBatches.filter((b) => b.status === "ACTIVE").length,
          completedBatches: filteredBatches.filter((b) => b.status === "COMPLETED").length,
          attendanceRate,
        },
        analytics: {
          districtInstitutions: Array.from(distInstMap.entries()).map(([label, count]) => ({ label, count })),
          districtStudents: Array.from(distStuMap.entries()).map(([label, count]) => ({ label, count })),
          universityStudents: Array.from(univStuMap.entries()).map(([label, count]) => ({ label, count })),
          institutionEnrollment: filteredInstitutions.slice(0, 10).map((i) => ({
            code: i.code,
            name: i.name,
            students: i._count.students,
            batches: i._count.batches,
            enrollments: i._count.enrollments,
          })),
          coursePopularity: Array.from(coursePopMap.values()),
          batchStatus: Array.from(batchStatusMap.entries()).map(([label, count]) => ({ label, count })),
          trainerAllocation: Array.from(trainerAllocMap.values()),
          attendanceTrends,
          completionTrends: {
            completed: completedEnrollments,
            inProgress: inProgressEnrollments,
            rate:
              filteredEnrollments.length > 0
                ? Math.round((completedEnrollments / filteredEnrollments.length) * 100)
                : 0,
          },
          certificateStats: certStats,
        },
        alerts,
        institutions: filteredInstitutions.slice(0, 25),
        recentAudits,
        filterOptions: {
          districts: uniqueDistricts,
          universities: allUniversities.map((u) => ({ id: u.id, code: u.code, name: u.name })),
          institutions: allInstitutions,
          courses: allCourses.map((c) => ({ id: c.id, code: c.code, title: c.title })),
          batches: filteredBatches.map((b) => ({ id: b.id, code: b.batchCode, name: b.name })),
          trainers: allTrainers.map((t) => ({ id: t.id, code: t.trainerCode, name: t.fullName })),
          academicYears: ["2025-2026", "2026-2027", "2027-2028"],
        },
      });
    }

    // Institution-scoped dashboard (Section 20)
    const instId = session.institutionId!;
    const today = new Date().toISOString().slice(0, 10);

    const [
      institution,
      totalStudents,
      activeStudents,
      batches,
      assignedCourses,
      enrollments,
      allAttendance,
      recentActivities,
    ] = await Promise.all([
      prisma.institution.findUnique({
        where: { id: instId },
        include: { university: { select: { name: true, code: true } } },
      }),
      prisma.student.count({ where: { institutionId: instId } }),
      prisma.student.count({ where: { institutionId: instId, isActive: true } }),
      prisma.batch.findMany({
        where: { institutionId: instId, isActive: true },
        include: {
          course: { select: { code: true, title: true } },
          trainer: { select: { fullName: true, trainerCode: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.institutionCourse.findMany({
        where: { institutionId: instId },
        include: { course: { select: { id: true, code: true, title: true } } },
      }),
      prisma.batchEnrollment.findMany({
        where: { batch: { institutionId: instId } },
        select: { progressPercent: true, status: true, enrolledAt: true, courseId: true },
      }),
      prisma.attendance.findMany({
        where: { batch: { institutionId: instId } },
        select: { date: true, status: true },
      }),
      prisma.auditLog.findMany({
        where: { institutionId: instId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((acc, e) => acc + e.progressPercent, 0) /
              enrollments.length
          )
        : 0;

    const attendanceTotal = allAttendance.length;
    const attendancePresent = allAttendance.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    const attendanceRate =
      attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;

    const todayRecs = allAttendance.filter((a) => a.date === today);
    const todaysAttendance =
      todayRecs.length > 0
        ? Math.round(
            (todayRecs.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length /
              todayRecs.length) *
              100
          )
        : attendanceRate;

    const activeBatchesCount = batches.filter((b) => b.status === "ACTIVE").length;
    const completedBatchesCount = batches.filter((b) => b.status === "COMPLETED").length;
    const plannedBatchesCount = batches.filter((b) => b.status === "PLANNED").length;

    const uniqueTrainerIds = new Set(
      batches.map((b) => b.trainerId).filter(Boolean)
    );

    const courseDistribution = assignedCourses.map((ic) => {
      const count = batches
        .filter((b) => b.courseId === ic.courseId)
        .reduce((sum, b) => sum + b._count.enrollments, 0);
      return { code: ic.course.code, title: ic.course.title, count };
    });

    const dateMap = new Map<string, { total: number; present: number }>();
    for (const a of allAttendance) {
      const cur = dateMap.get(a.date) || { total: 0, present: 0 };
      cur.total += 1;
      if (["PRESENT", "LATE"].includes(a.status)) cur.present += 1;
      dateMap.set(a.date, cur);
    }
    const attendanceTrend = Array.from(dateMap.entries())
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .slice(-5)
      .map(([date, val]) => ({
        date,
        rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
      }));

    const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED").length;
    const completionRate =
      enrollments.length > 0
        ? Math.round((completedEnrollments / enrollments.length) * 100)
        : 0;

    return NextResponse.json({
      scope: "INSTITUTION",
      institution,
      stats: {
        totalStudents,
        activeStudents,
        activeBatches: activeBatchesCount,
        completedBatches: completedBatchesCount,
        totalBatches: batches.length,
        assignedCourses: assignedCourses.length,
        assignedTrainers: uniqueTrainerIds.size,
        totalEnrollments: enrollments.length,
        avgProgress,
        attendanceRate,
        todaysAttendance,
        completionRate,
      },
      charts: {
        batchStatus: [
          { label: "ACTIVE", count: activeBatchesCount },
          { label: "PLANNED", count: plannedBatchesCount },
          { label: "COMPLETED", count: completedBatchesCount },
        ],
        courseDistribution,
        attendanceTrend,
      },
      batches,
      recentActivities,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
