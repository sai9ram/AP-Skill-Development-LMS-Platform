import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, logAudit, requirePermission } from "@/lib/auth";

interface RawImportRow {
  universityCode: string;
  universityRegNo: string;
  studentName: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  qualification: string;
  academicYear: string;
  institutionCode: string;
}

export async function GET() {
  const templateCsv = [
    "University Code,University Registration Number,Student Name,Mobile,Email,Gender,DOB,Qualification,Academic Year,Institution Code",
    "AU,23131A0588,Ananya Sharma,9876543210,ananya.588@gvpce.ac.in,Female,2005-04-12,B.Tech,2026-2027,AP-VSP-001",
    "JNTUK,238W1A0599,Kiran Kumar R.,9876543211,kiran.599@vrsec.ac.in,Male,2005-08-21,B.Tech,2026-2027,AP-NTR-002",
  ].join("\n");

  return new NextResponse(templateCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ap-lms-student-import-template.csv"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("students:manage");
    const body = await req.json();
    const mode = body.mode === "commit" ? "commit" : "validate";
    const rows: RawImportRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    const [universities, institutions, existingStudents, patternCfg] = await Promise.all([
      prisma.university.findMany({ select: { id: true, code: true } }),
      prisma.institution.findMany({
        select: { id: true, code: true, district: true, universityId: true },
      }),
      prisma.student.findMany({
        select: { institutionId: true, universityRollNo: true, email: true },
      }),
      prisma.systemConfig.findUnique({ where: { key: "STUDENT_ID_PATTERN" } }),
    ]);

    const univByCode = new Map(universities.map((u) => [u.code.toUpperCase(), u]));
    const instByCode = new Map(institutions.map((i) => [i.code.toUpperCase(), i]));
    const existingRollKeys = new Set(
      existingStudents.map((s) => `${s.institutionId}:${s.universityRollNo.toUpperCase()}`)
    );

    const seenInBatch = new Set<string>();
    const validRecords: Array<RawImportRow & { rowNumber: number; institutionId: string; universityId: string }> = [];
    const invalidRecords: Array<{ rowNumber: number; row: RawImportRow; reason: string }> = [];
    const duplicateRecords: Array<{ rowNumber: number; row: RawImportRow; reason: string }> = [];

    rows.forEach((r, idx) => {
      const rowNumber = idx + 1;
      const uCode = String(r.universityCode || "").trim().toUpperCase();
      const regNo = String(r.universityRegNo || "").trim().toUpperCase();
      const name = String(r.studentName || "").trim();
      const mobile = String(r.mobile || "").trim();
      const email = String(r.email || "").trim().toLowerCase();
      const instCode = String(r.institutionCode || "").trim().toUpperCase();

      if (!uCode || !regNo || !name || !mobile || !email || !instCode) {
        invalidRecords.push({ rowNumber, row: r, reason: "Missing required fields" });
        return;
      }
      if (!/^\d{10}$/.test(mobile)) {
        invalidRecords.push({ rowNumber, row: r, reason: "Mobile must be 10 digits" });
        return;
      }
      if (!email.includes("@")) {
        invalidRecords.push({ rowNumber, row: r, reason: "Invalid email format" });
        return;
      }

      const univ = univByCode.get(uCode);
      if (!univ) {
        invalidRecords.push({ rowNumber, row: r, reason: `Unknown University Code: ${uCode}` });
        return;
      }

      const inst = instByCode.get(instCode);
      if (!inst) {
        invalidRecords.push({ rowNumber, row: r, reason: `Unknown Institution Code: ${instCode}` });
        return;
      }

      if (
        session.scope !== "STATEWIDE" &&
        session.scope !== "DISTRICT" &&
        inst.id !== session.institutionId
      ) {
        invalidRecords.push({
          rowNumber,
          row: r,
          reason: `Forbidden: cannot import into another institution (${instCode})`,
        });
        return;
      }

      const dupKey = `${inst.id}:${regNo}`;
      if (existingRollKeys.has(dupKey) || seenInBatch.has(dupKey)) {
        duplicateRecords.push({
          rowNumber,
          row: r,
          reason: `Duplicate University Registration Number (${regNo}) for ${instCode}`,
        });
        return;
      }

      seenInBatch.add(dupKey);
      validRecords.push({
        ...r,
        universityCode: uCode,
        universityRegNo: regNo,
        studentName: name,
        mobile,
        email,
        institutionCode: instCode,
        rowNumber,
        institutionId: inst.id,
        universityId: univ.id,
      });
    });

    if (mode === "validate") {
      return NextResponse.json({
        mode: "validate",
        summary: {
          total: rows.length,
          valid: validRecords.length,
          invalid: invalidRecords.length,
          duplicate: duplicateRecords.length,
        },
        validRecords,
        invalidRecords,
        duplicateRecords,
      });
    }

    // Commit valid records only inside a database transaction
    const pattern =
      patternCfg?.value ||
      "AP-{UNIVERSITY_CODE}-{INSTITUTION_CODE}-{YEAR}-{SEQUENCE}";
    let currentCount = await prisma.student.count();
    const year = new Date().getFullYear().toString();

    const createdStudents = await prisma.$transaction(async (tx) => {
      const inserted = [];
      for (const vr of validRecords) {
        currentCount += 1;
        const seq = String(currentCount).padStart(6, "0");
        const studentUid = pattern
          .replace("{UNIVERSITY_CODE}", vr.universityCode.replace(/[^A-Za-z0-9]/g, ""))
          .replace("{INSTITUTION_CODE}", vr.institutionCode.replace(/[^A-Za-z0-9]/g, ""))
          .replace("{YEAR}", year)
          .replace("{SEQUENCE}", seq);

        const created = await tx.student.create({
          data: {
            studentUid,
            universityId: vr.universityId,
            universityRollNo: vr.universityRegNo,
            institutionId: vr.institutionId,
            fullName: vr.studentName,
            phone: vr.mobile,
            email: vr.email,
            gender: vr.gender || "Other",
            dateOfBirth: vr.dob || null,
            qualification: vr.qualification || "B.Tech",
            academicYear: vr.academicYear || "2026-2027",
            branch: "CSE",
            status: "ACTIVE",
            createdBy: session.email,
          },
        });
        inserted.push(created);
      }
      return inserted;
    });

    await logAudit({
      actorId: session.userId,
      actorRole: session.role,
      actorEmail: session.email,
      institutionId: session.institutionId,
      action: "BULK_STUDENT_IMPORT",
      module: "Students",
      entityType: "Student",
      details: {
        importedCount: createdStudents.length,
        skippedInvalid: invalidRecords.length,
        skippedDuplicate: duplicateRecords.length,
      },
    });

    return NextResponse.json({
      mode: "commit",
      importedCount: createdStudents.length,
      skippedInvalid: invalidRecords.length,
      skippedDuplicate: duplicateRecords.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to process student import" }, { status: 400 });
  }
}
