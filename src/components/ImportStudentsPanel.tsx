"use client";

import React, { useState } from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";
import { NoticeBanner, SectionHeader } from "./ui/SharedUI";

interface ValidationResult {
  summary: { total: number; valid: number; invalid: number; duplicate: number };
  validRecords: Array<{ rowNumber: number; studentName: string; universityRegNo: string; institutionCode: string }>;
  invalidRecords: Array<{ rowNumber: number; reason: string; row: { studentName?: string } }>;
  duplicateRecords: Array<{ rowNumber: number; reason: string; row: { studentName?: string } }>;
}

function parseCsvText(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  // Skip header row
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      universityCode: cols[0] || "",
      universityRegNo: cols[1] || "",
      studentName: cols[2] || "",
      mobile: cols[3] || "",
      email: cols[4] || "",
      gender: cols[5] || "Other",
      dob: cols[6] || "",
      qualification: cols[7] || "B.Tech",
      academicYear: cols[8] || "2026-2027",
      institutionCode: cols[9] || "",
    };
  });
}

export function ImportStudentsPanel({ onImported }: { onImported?: () => void }) {
  const [csvText, setCsvText] = useState(
    "University Code,University Registration Number,Student Name,Mobile,Email,Gender,DOB,Qualification,Academic Year,Institution Code\nAU,23131A0588,Ananya Sharma,9876543210,ananya.588@gvpce.ac.in,Female,2005-04-12,B.Tech,2026-2027,AP-VSP-001"
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setValidation(null);
  }

  async function runValidation() {
    setLoading(true);
    setNotice("");
    const rows = parseCsvText(csvText);
    const res = await fetch("/api/students/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "validate", rows }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setNotice(data.error || "Validation failed");
    else setValidation(data);
  }

  async function commitImport() {
    setLoading(true);
    const rows = parseCsvText(csvText);
    const res = await fetch("/api/students/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "commit", rows }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setNotice(data.error || "Import failed");
    else {
      setNotice(
        `Imported ${data.importedCount} valid students (Skipped ${data.skippedInvalid} invalid, ${data.skippedDuplicate} duplicates).`
      );
      setValidation(null);
      onImported?.();
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Import Students from CSV"
        subtitle="Upload a CSV file to add multiple students at once. We check for missing details and duplicates before saving."
        action={
          <a
            href="/api/students/import"
            className="inline-flex items-center gap-2 px-3 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </a>
        }
      />

      <NoticeBanner message={notice} onClose={() => setNotice("")} />

      <div className="p-5 border border-[#0F3D2E]/25 rounded-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-[#0F3D2E] rounded text-xs font-bold cursor-pointer hover:bg-[#0F3D2E]/5">
            <Upload className="w-4 h-4" />
            Upload CSV File
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={runValidation}
            disabled={loading}
            className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] cursor-pointer"
          >
            {loading ? "Validating..." : "Validate Records"}
          </button>
        </div>

        <textarea
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full p-3 text-xs font-mono border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
        />
      </div>

      {validation && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 border border-[#0F3D2E]/30 rounded">
              <p className="opacity-70 font-bold">Total Rows</p>
              <p className="text-xl font-bold">{validation.summary.total}</p>
            </div>
            <div className="p-3 border-2 border-[#0F3D2E] rounded bg-[#0F3D2E]/5">
              <p className="font-bold">Valid Records</p>
              <p className="text-xl font-bold">{validation.summary.valid}</p>
            </div>
            <div className="p-3 border border-[#0F3D2E]/30 rounded">
              <p className="font-bold">Invalid Records</p>
              <p className="text-xl font-bold">{validation.summary.invalid}</p>
            </div>
            <div className="p-3 border border-[#0F3D2E]/30 rounded">
              <p className="font-bold">Duplicate Records</p>
              <p className="text-xl font-bold">{validation.summary.duplicate}</p>
            </div>
          </div>

          {validation.summary.valid > 0 && (
            <button
              onClick={commitImport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Import {validation.summary.valid} Valid Student(s)
            </button>
          )}

          {(validation.invalidRecords.length > 0 || validation.duplicateRecords.length > 0) && (
            <div className="border border-[#0F3D2E]/25 rounded-lg p-4 text-xs space-y-1.5">
              <p className="font-bold uppercase">Validation Issues</p>
              {validation.invalidRecords.map((ir) => (
                <p key={`inv-${ir.rowNumber}`}>Row {ir.rowNumber} ({ir.row.studentName || "—"}): [INVALID] {ir.reason}</p>
              ))}
              {validation.duplicateRecords.map((dr) => (
                <p key={`dup-${dr.rowNumber}`}>Row {dr.rowNumber} ({dr.row.studentName || "—"}): [DUPLICATE] {dr.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
