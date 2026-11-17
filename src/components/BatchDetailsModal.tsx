"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "./ui/SharedUI";

type BatchTab = "Overview" | "Students" | "Attendance" | "Trainer" | "Course" | "Reports" | "Activity";

interface BatchDetailResponse {
  batch: {
    id: string;
    batchCode: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    trainingMode: string;
    location: string;
    maxCapacity: number;
    institution: { name: string; code: string; district: string; university: { code: string; name: string } };
    course: { code: string; title: string; sector: string; durationHours: number; level: string; eligibility: string };
    trainer: { trainerCode: string; fullName: string; email: string; phone: string; specialization: string; qualification: string } | null;
    enrollments: Array<{
      id: string;
      progressPercent: number;
      status: string;
      student: { id: string; studentUid: string; universityRollNo: string; fullName: string; branch: string };
    }>;
  };
  metrics: {
    enrolledCount: number;
    conductedSessions: number;
    avgAttendance: number;
    avgProgress: number;
  };
  conductedDates: string[];
  activities: Array<{ id: string; action: string; actorEmail: string; createdAt: string }>;
}

export function BatchDetailsModal({
  batchId,
  onClose,
}: {
  batchId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<BatchTab>("Overview");
  const [data, setData] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/batches/${batchId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [batchId]);

  const tabs: BatchTab[] = ["Overview", "Students", "Attendance", "Trainer", "Course", "Reports", "Activity"];

  return (
    <div className="fixed inset-0 z-50 bg-[#0F3D2E]/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white border-2 border-[#0F3D2E] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#0F3D2E]">
        <div className="px-5 py-3.5 bg-[#0F3D2E] text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">
              Batch Details
            </p>
            <h3 className="text-sm font-bold">
              {data ? `${data.batch.batchCode} — ${data.batch.name}` : "Loading Batch..."}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 border border-white/40 rounded text-xs font-bold hover:bg-white hover:text-[#0F3D2E] cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="px-5 pt-3 border-b border-[#0F3D2E]/20 flex flex-wrap gap-1.5 bg-[#0F3D2E]/5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-bold rounded-t border-t border-x cursor-pointer ${
                tab === t
                  ? "bg-white text-[#0F3D2E] border-[#0F3D2E]/30"
                  : "border-transparent text-[#0F3D2E]/70 hover:text-[#0F3D2E]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto text-xs space-y-4">
          {loading && <p className="text-center py-8 font-semibold">Loading batch details...</p>}
          {!loading && data && (
            <>
              {tab === "Overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-1.5">
                    <p className="font-bold uppercase text-[11px] border-b border-[#0F3D2E]/15 pb-1">Batch Information</p>
                    <p><span className="font-bold">Batch Code:</span> <span className="font-mono">{data.batch.batchCode}</span></p>
                    <p><span className="font-bold">Institution:</span> {data.batch.institution.code} — {data.batch.institution.name}</p>
                    <p><span className="font-bold">Schedule:</span> {data.batch.startDate} to {data.batch.endDate}</p>
                    <p><span className="font-bold">Mode / Location:</span> {data.batch.trainingMode} • {data.batch.location}</p>
                    <p><span className="font-bold">Capacity:</span> {data.metrics.enrolledCount} / {data.batch.maxCapacity}</p>
                    <StatusBadge active={data.batch.status === "ACTIVE"} activeLabel={data.batch.status} inactiveLabel={data.batch.status} />
                  </div>
                  <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-2">
                    <p className="font-bold uppercase text-[11px] border-b border-[#0F3D2E]/15 pb-1">Batch Metrics</p>
                    <p><span className="font-bold">Enrolled Students:</span> {data.metrics.enrolledCount}</p>
                    <p><span className="font-bold">Conducted Sessions:</span> {data.metrics.conductedSessions}</p>
                    <p><span className="font-bold">Average Attendance:</span> {data.metrics.avgAttendance}%</p>
                    <p><span className="font-bold">Average Training Progress:</span> {data.metrics.avgProgress}%</p>
                  </div>
                </div>
              )}

              {tab === "Students" && (
                <table className="w-full text-left border border-[#0F3D2E]/25">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-2.5">Student ID</th>
                      <th className="p-2.5">Univ Reg No</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Branch</th>
                      <th className="p-2.5">Progress</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {data.batch.enrollments.map((en) => (
                      <tr key={en.id}>
                        <td className="p-2.5 font-mono font-bold">{en.student.studentUid}</td>
                        <td className="p-2.5 font-mono">{en.student.universityRollNo}</td>
                        <td className="p-2.5 font-semibold">{en.student.fullName}</td>
                        <td className="p-2.5">{en.student.branch}</td>
                        <td className="p-2.5 font-bold">{en.progressPercent}%</td>
                        <td className="p-2.5">{en.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "Attendance" && (
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-2">
                  <p className="font-bold">Conducted Dates ({data.conductedDates.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {data.conductedDates.map((d) => (
                      <span key={d} className="px-2.5 py-1 border border-[#0F3D2E] rounded font-mono">{d}</span>
                    ))}
                    {data.conductedDates.length === 0 && <p className="opacity-60">No sessions recorded yet.</p>}
                  </div>
                </div>
              )}

              {tab === "Trainer" && (
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-1.5">
                  {data.batch.trainer ? (
                    <>
                      <p className="font-bold text-sm">{data.batch.trainer.fullName} ({data.batch.trainer.trainerCode})</p>
                      <p><span className="font-bold">Specialization:</span> {data.batch.trainer.specialization}</p>
                      <p><span className="font-bold">Qualification:</span> {data.batch.trainer.qualification}</p>
                      <p><span className="font-bold">Contact:</span> {data.batch.trainer.email} • {data.batch.trainer.phone}</p>
                    </>
                  ) : (
                    <p className="opacity-70">No trainer assigned to this batch yet.</p>
                  )}
                </div>
              )}

              {tab === "Course" && (
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-1.5">
                  <p className="font-bold text-sm">{data.batch.course.code} — {data.batch.course.title}</p>
                  <p><span className="font-bold">Sector:</span> {data.batch.course.sector}</p>
                  <p><span className="font-bold">Duration / Level:</span> {data.batch.course.durationHours} hrs • {data.batch.course.level}</p>
                  <p><span className="font-bold">Eligibility:</span> {data.batch.course.eligibility}</p>
                </div>
              )}

              {tab === "Reports" && (
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg flex flex-wrap gap-3">
                  <a href="/api/reports?type=attendance&format=csv" className="px-3 py-2 bg-[#0F3D2E] text-white font-bold rounded">
                    Export Attendance CSV
                  </a>
                  <a href="/api/reports?type=batches&format=excel" className="px-3 py-2 border border-[#0F3D2E] font-bold rounded">
                    Export Batch Excel
                  </a>
                  <a target="_blank" rel="noreferrer" href="/api/reports?type=batches&format=pdf" className="px-3 py-2 border border-[#0F3D2E] font-bold rounded">
                    Print / PDF Summary
                  </a>
                </div>
              )}

              {tab === "Activity" && (
                <div className="border border-[#0F3D2E]/25 rounded-lg divide-y divide-[#0F3D2E]/10">
                  {data.activities.map((a) => (
                    <div key={a.id} className="p-3">
                      <p className="font-bold">{a.action}</p>
                      <p className="opacity-75">{a.actorEmail} • {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {data.activities.length === 0 && <p className="p-4 opacity-60">No activity logs for this batch.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
