import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertInstitutionScope,
  AuthError,
  logAudit,
  requireAnyPermission,
} from "@/lib/auth";

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null>>) {
  const escape = (val: string | number | boolean | null) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

function toExcelHtml(title: string, headers: string[], rows: Array<Array<string | number | boolean | null>>) {
  const ths = headers.map((h) => `<th style="background:#0F3D2E;color:#FFFFFF;padding:6px;border:1px solid #0F3D2E;">${h}</th>`).join("");
  const trs = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:5px;border:1px solid #0F3D2E;">${String(c ?? "")}</td>`).join("")}</tr>`
    )
    .join("");
  return `<html><head><meta charset="utf-8"/></head><body><h3>${title}</h3><table border="1"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
}

function toPrintablePdfHtml(
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null>>
) {
  const ths = headers.map((h) => `<th>${h}</th>`).join("");
  const trs = rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`)
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0F3D2E; background: #FFFFFF; margin: 28px; }
    .hdr { border-bottom: 3px solid #0F3D2E; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .hdr h1 { margin: 0; font-size: 18px; }
    .hdr p { margin: 2px 0 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0F3D2E; color: #FFFFFF; text-align: left; padding: 7px; border: 1px solid #0F3D2E; }
    td { padding: 6px; border: 1px solid #0F3D2E; }
    tr:nth-child(even) td { background: #F4F7F5; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1>ANDHRA PRADESH SKILL DEVELOPMENT LMS</h1>
      <p>${title} — ${subtitle}</p>
    </div>
    <button class="no-print" onclick="window.print()" style="background:#0F3D2E;color:#fff;border:none;padding:8px 14px;cursor:pointer;font-weight:bold;">Print / Save as PDF</button>
  </div>
  <table>
    <thead><tr>${ths}</tr></thead>
    <tbody>${trs}</tbody>
  </table>
</body>
</html>`;
}

function resolveDateRange(preset: string, startStr?: string | null, endStr?: string | null) {
  const now = new Date();
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "custom" && startStr && endStr) {
    return { start: new Date(startStr), end: new Date(endStr + "T23:59:59"), startStr, endStr };
  }
  if (preset === "today") {
    const s = toIso(now);
    return { start: new Date(s), end: new Date(s + "T23:59:59"), startStr: s, endStr: s };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const s = toIso(y);
    return { start: new Date(s), end: new Date(s + "T23:59:59"), startStr: s, endStr: s };
  }
  if (preset === "this_week") {
    const w = new Date(now);
    w.setDate(w.getDate() - 7);
    return { start: w, end: now, startStr: toIso(w), endStr: toIso(now) };
  }
  if (preset === "this_month") {
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: m, end: now, startStr: toIso(m), endStr: toIso(now) };
  }
  if (preset === "last_month") {
    const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const m2 = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start: m1, end: m2, startStr: toIso(m1), endStr: toIso(m2) };
  }
  if (preset === "this_quarter") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const q = new Date(now.getFullYear(), qStartMonth, 1);
    return { start: q, end: now, startStr: toIso(q), endStr: toIso(now) };
  }
  if (preset === "this_year") {
    const y = new Date(now.getFullYear(), 0, 1);
    return { start: y, end: now, startStr: toIso(y), endStr: toIso(now) };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format") || "json";
    const session = await requireAnyPermission(
      format !== "json" ? ["reports:export"] : ["reports:read", "reports:export"]
    );
    const type = (req.nextUrl.searchParams.get("type") || "students").toLowerCase();
    const requestedInstId = req.nextUrl.searchParams.get("institutionId");
    const datePreset = req.nextUrl.searchParams.get("datePreset") || "all";
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const range = resolveDateRange(datePreset, startDate, endDate);

    let targetInstId: string | undefined;
    if (session.scope !== "STATEWIDE" && session.scope !== "DISTRICT") {
      if (requestedInstId && requestedInstId !== session.institutionId) {
        await assertInstitutionScope(session, requestedInstId);
      }
      targetInstId = session.institutionId!;
      if (["institution", "university", "district"].includes(type)) {
        return NextResponse.json(
          { error: "Forbidden: statewide reports are restricted to Super Admin" },
          { status: 403 }
        );
      }
    } else if (requestedInstId && requestedInstId !== "ALL") {
      targetInstId = requestedInstId;
    }

    let title = "AP Skill Development Report";
    let headers: string[] = [];
    let tableRows: Array<Array<string | number | boolean | null>> = [];

    if (type === "student" || type === "students") {
      title = "Student Registry Report";
      headers = ["LMS Student ID", "Univ Reg No", "Full Name", "Email", "Branch", "Year", "Institution Code", "Institution Name", "Status"];
      const list = await prisma.student.findMany({
        where: {
          ...(targetInstId ? { institutionId: targetInstId } : {}),
          ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
        },
        include: { institution: { select: { name: true, code: true } } },
        orderBy: { studentUid: "asc" },
      });
      tableRows = list.map((s) => [
        s.studentUid,
        s.universityRollNo,
        s.fullName,
        s.email,
        s.branch,
        s.yearOfStudy,
        s.institution.code,
        s.institution.name,
        s.status,
      ]);
    } else if (type === "batch" || type === "batches") {
      title = "Batches & Enrollment Report";
      headers = ["Batch Code", "Batch Name", "Institution", "Course", "Trainer", "Mode", "Status", "Enrolled", "Capacity", "Start Date", "End Date"];
      const list = await prisma.batch.findMany({
        where: targetInstId ? { institutionId: targetInstId } : {},
        include: {
          institution: { select: { name: true } },
          course: { select: { code: true, title: true } },
          trainer: { select: { fullName: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { batchCode: "asc" },
      });
      tableRows = list.map((b) => [
        b.batchCode,
        b.name,
        b.institution.name,
        `${b.course.code} - ${b.course.title}`,
        b.trainer?.fullName ?? "Unassigned",
        b.trainingMode,
        b.status,
        b._count.enrollments,
        b.maxCapacity,
        b.startDate,
        b.endDate,
      ]);
    } else if (type === "attendance") {
      title = "Attendance Compliance Report";
      headers = ["Date", "Batch Code", "Institution", "LMS Student ID", "Univ Reg No", "Student Name", "Status"];
      const list = await prisma.attendance.findMany({
        where: {
          ...(targetInstId ? { batch: { institutionId: targetInstId } } : {}),
          ...(range ? { date: { gte: range.startStr, lte: range.endStr } } : {}),
        },
        include: {
          batch: { select: { batchCode: true, institution: { select: { name: true } } } },
          student: { select: { studentUid: true, universityRollNo: true, fullName: true } },
        },
        orderBy: { date: "desc" },
        take: 500,
      });
      tableRows = list.map((a) => [
        a.date,
        a.batch.batchCode,
        a.batch.institution.name,
        a.student.studentUid,
        a.student.universityRollNo,
        a.student.fullName,
        a.status,
      ]);
    } else if (type === "institution") {
      title = "Statewide Institutions Report";
      headers = ["Code", "Institution Name", "Type", "District", "University", "Students", "Batches", "Status"];
      const list = await prisma.institution.findMany({
        include: {
          university: { select: { code: true } },
          _count: { select: { students: true, batches: true } },
        },
        orderBy: { code: "asc" },
      });
      tableRows = list.map((i) => [
        i.code,
        i.name,
        i.institutionType,
        i.district,
        i.university.code,
        i._count.students,
        i._count.batches,
        i.status,
      ]);
    } else if (type === "university") {
      title = "Universities Report";
      headers = ["Code", "University Name", "Type", "District", "State", "Colleges", "Students", "Status"];
      const list = await prisma.university.findMany({
        include: { _count: { select: { institutions: true, students: true } } },
        orderBy: { code: "asc" },
      });
      tableRows = list.map((u) => [
        u.code,
        u.name,
        u.universityType,
        u.district,
        u.state,
        u._count.institutions,
        u._count.students,
        u.status,
      ]);
    } else if (type === "district") {
      title = "District-Wise Analytics Report";
      headers = ["District", "Institutions", "Students", "Batches"];
      const insts = await prisma.institution.findMany({
        include: { _count: { select: { students: true, batches: true } } },
      });
      const map = new Map<string, { insts: number; students: number; batches: number }>();
      for (const i of insts) {
        const cur = map.get(i.district) || { insts: 0, students: 0, batches: 0 };
        cur.insts += 1;
        cur.students += i._count.students;
        cur.batches += i._count.batches;
        map.set(i.district, cur);
      }
      tableRows = Array.from(map.entries()).map(([dist, v]) => [dist, v.insts, v.students, v.batches]);
    } else if (type === "course") {
      title = "Course Catalog & Delivery Report";
      headers = ["Code", "Course Title", "Sector", "Duration", "Level", "Status", "Batches"];
      const list = await prisma.course.findMany({
        include: { _count: { select: { batches: true } } },
      });
      tableRows = list.map((c) => [c.code, c.title, c.sector, `${c.durationHours} ${c.durationUnit}`, c.level, c.status, c._count.batches]);
    } else if (type === "trainer") {
      title = "Trainer Allocation Report";
      headers = ["Trainer Code", "Full Name", "Specialization", "Experience (Yrs)", "Status", "Assigned Batches"];
      const list = await prisma.trainer.findMany({
        include: { _count: { select: { batches: true } } },
      });
      tableRows = list.map((t) => [t.trainerCode, t.fullName, t.specialization, t.experience, t.status, t._count.batches]);
    } else if (type === "certificate") {
      title = "Certificate Issuance Report";
      headers = ["Certificate No", "Student UID", "Student Name", "Course", "Institution", "Status", "Issued Date"];
      const list = await prisma.certificate.findMany({
        where: targetInstId ? { institutionId: targetInstId } : {},
        include: {
          student: { select: { studentUid: true, fullName: true } },
          course: { select: { code: true } },
          institution: { select: { code: true } },
        },
      });
      tableRows = list.map((c) => [
        c.certificateNumber,
        c.student.studentUid,
        c.student.fullName,
        c.course.code,
        c.institution.code,
        c.status,
        c.issuedDate ? c.issuedDate.toISOString().slice(0, 10) : "Pending",
      ]);
    } else {
      // enrollment, completion, monthly, quarterly, half_yearly, annual
      title = `${type.replace("_", " ").toUpperCase()} Report`;
      headers = ["Batch Code", "Institution", "LMS Student ID", "Student Name", "Course", "Progress %", "Completion", "Certificate"];
      const list = await prisma.batchEnrollment.findMany({
        where: {
          ...(targetInstId ? { batch: { institutionId: targetInstId } } : {}),
          ...(range ? { enrolledAt: { gte: range.start, lte: range.end } } : {}),
        },
        include: {
          batch: {
            select: {
              batchCode: true,
              institution: { select: { code: true } },
              course: { select: { code: true } },
            },
          },
          student: { select: { studentUid: true, fullName: true } },
        },
      });
      tableRows = list.map((e) => [
        e.batch.batchCode,
        e.batch.institution.code,
        e.student.studentUid,
        e.student.fullName,
        e.batch.course.code,
        `${e.progressPercent}%`,
        e.completionStatus,
        e.certificateStatus,
      ]);
    }

    if (format !== "json") {
      await logAudit({
        actorId: session.userId,
        actorRole: session.role,
        actorEmail: session.email,
        institutionId: targetInstId ?? null,
        action: "EXPORT",
        module: "Reports",
        entityType: "Report",
        details: { type, format, rowCount: tableRows.length, datePreset },
      });
    }

    if (format === "csv") {
      const csv = toCsv(headers, tableRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ap-lms-${type}-report.csv"`,
        },
      });
    }

    if (format === "excel") {
      const xls = toExcelHtml(title, headers, tableRows);
      return new NextResponse(xls, {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="ap-lms-${type}-report.xls"`,
        },
      });
    }

    if (format === "pdf") {
      const subtitle = range ? `${range.startStr} to ${range.endStr}` : "All Time";
      const pdfHtml = toPrintablePdfHtml(title, subtitle, headers, tableRows);
      return new NextResponse(pdfHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      title,
      headers,
      rows: tableRows,
      dateRange: range ? { start: range.startStr, end: range.endStr } : null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
