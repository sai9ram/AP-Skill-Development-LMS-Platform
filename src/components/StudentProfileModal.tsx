"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "./ui/SharedUI";

interface StudentProfileData {
  student: {
    id: string;
    studentUid: string;
    universityRollNo: string;
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string | null;
    qualification: string;
    branch: string;
    academicYear: string;
    yearOfStudy: number;
    status: string;
    maskedIdentifier?: string;
    university: { code: string; name: string };
    institution: { code: string; name: string; district: string };
    enrollments: Array<{
      id: string;
      progressPercent: number;
      status: string;
      completionStatus: string;
      certificateStatus: string;
      batch: {
        batchCode: string;
        name: string;
        status: string;
        course: { code: string; title: string };
        trainer: { fullName: string; trainerCode: string } | null;
      };
    }>;
    certificates: Array<{
      id: string;
      certificateNumber: string;
      status: string;
      course: { code: string; title: string };
    }>;
  };
  attendanceSummary: {
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    attendancePercent: number;
  };
  activities: Array<{
    id: string;
    action: string;
    actorEmail: string;
    createdAt: string;
  }>;
}

export function StudentProfileModal({
  studentId,
  onClose,
}: {
  studentId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/students/${studentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0F3D2E]/60 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white border-2 border-[#0F3D2E] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#0F3D2E]">
        <div className="px-5 py-3.5 bg-[#0F3D2E] text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">
              Student Profile
            </p>
            <h3 className="text-sm font-bold">
              {data ? `${data.student.fullName} (${data.student.studentUid})` : "Loading Student Profile..."}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 border border-white/40 rounded text-xs font-bold hover:bg-white hover:text-[#0F3D2E] cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {loading && <p className="text-center py-8 font-semibold">Loading profile...</p>}
          {!loading && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-1.5">
                  <p className="font-bold uppercase text-[11px] border-b border-[#0F3D2E]/15 pb-1">
                    Basic &amp; Academic Information
                  </p>
                  <p><span className="font-bold">Student ID:</span> <span className="font-mono">{data.student.studentUid}</span></p>
                  <p><span className="font-bold">Univ Reg No:</span> <span className="font-mono">{data.student.universityRollNo}</span></p>
                  <p><span className="font-bold">Email / Mobile:</span> {data.student.email} • {data.student.phone}</p>
                  <p><span className="font-bold">Qualification / Branch:</span> {data.student.qualification} • {data.student.branch} (Year {data.student.yearOfStudy})</p>
                  <p><span className="font-bold">Academic Year:</span> {data.student.academicYear}</p>
                  {data.student.maskedIdentifier && (
                    <p><span className="font-bold">Identifier:</span> <span className="font-mono">{data.student.maskedIdentifier}</span></p>
                  )}
                  <div className="pt-1">
                    <StatusBadge active={data.student.status === "ACTIVE"} activeLabel={data.student.status} inactiveLabel={data.student.status} />
                  </div>
                </div>

                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-1.5">
                  <p className="font-bold uppercase text-[11px] border-b border-[#0F3D2E]/15 pb-1">
                    University, Institution &amp; Attendance
                  </p>
                  <p><span className="font-bold">University:</span> {data.student.university.code} — {data.student.university.name}</p>
                  <p><span className="font-bold">Institution:</span> {data.student.institution.code} — {data.student.institution.name}</p>
                  <p><span className="font-bold">District:</span> {data.student.institution.district}</p>
                  <div className="mt-2 p-2.5 rounded bg-[#0F3D2E]/5 border border-[#0F3D2E]/20">
                    <p className="font-bold">
                      Cumulative Attendance: {data.attendanceSummary.attendancePercent}%
                    </p>
                    <p className="text-[11px]">
                      Present: {data.attendanceSummary.presentSessions} • Absent: {data.attendanceSummary.absentSessions} • Total Sessions: {data.attendanceSummary.totalSessions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-[#0F3D2E] text-white font-bold uppercase text-[11px]">
                  Course Enrollment, Batch History &amp; Progress
                </div>
                <table className="w-full text-left">
                  <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/15">
                    <tr>
                      <th className="p-2.5 font-bold">Batch</th>
                      <th className="p-2.5 font-bold">Course</th>
                      <th className="p-2.5 font-bold">Trainer</th>
                      <th className="p-2.5 font-bold">Progress</th>
                      <th className="p-2.5 font-bold">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/10">
                    {data.student.enrollments.map((en) => (
                      <tr key={en.id}>
                        <td className="p-2.5 font-mono font-bold">{en.batch.batchCode}</td>
                        <td className="p-2.5">{en.batch.course.code} — {en.batch.course.title}</td>
                        <td className="p-2.5">{en.batch.trainer?.fullName || "Unassigned"}</td>
                        <td className="p-2.5 font-bold">{en.progressPercent}% ({en.completionStatus})</td>
                        <td className="p-2.5">{en.certificateStatus}</td>
                      </tr>
                    ))}
                    {data.student.enrollments.length === 0 && (
                      <tr><td colSpan={5} className="p-3 text-center opacity-60">No batch enrollments yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#0F3D2E]/25 rounded-lg p-3">
                  <p className="font-bold uppercase text-[11px] mb-2">Certificates ({data.student.certificates.length})</p>
                  {data.student.certificates.map((c) => (
                    <p key={c.id} className="py-1 border-b border-[#0F3D2E]/10">
                      <span className="font-mono font-bold">{c.certificateNumber}</span> — {c.course.code} [{c.status}]
                    </p>
                  ))}
                  {data.student.certificates.length === 0 && <p className="opacity-60">No certificates issued yet.</p>}
                </div>

                <div className="border border-[#0F3D2E]/25 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="font-bold uppercase text-[11px] mb-2">Activity History</p>
                  {data.activities.map((a) => (
                    <div key={a.id} className="py-1 border-b border-[#0F3D2E]/10 text-[11px]">
                      <span className="font-bold">{a.action}</span> by {a.actorEmail}
                      <span className="block opacity-60">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
