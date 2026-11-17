"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Layers,
  BookOpen,
  ClipboardCheck,
  FileBarChart,
  UserCog,
  LogOut,
  Search,
  Plus,
  Download,
  Shield,
  Bell,
  Clock,
  CheckCircle2,
  Upload,
  Eye,
  Menu,
  X,
} from "lucide-react";
import { BrandEmblem } from "./BrandEmblem";
import {
  can,
  canAny,
  CurrentUser,
  NoticeBanner,
  SectionHeader,
  StatCard,
  StatusBadge,
} from "./ui/SharedUI";
import { ProfilePanel } from "./ProfilePanel";
import { NotificationCenterPanel } from "./NotificationCenterPanel";
import { StudentProfileModal } from "./StudentProfileModal";
import { BatchDetailsModal } from "./BatchDetailsModal";
import { ImportStudentsPanel } from "./ImportStudentsPanel";

type Tab =
  | "overview"
  | "students"
  | "import_students"
  | "batches"
  | "courses_trainers"
  | "attendance"
  | "reports"
  | "notifications"
  | "profile";

interface StudentRow {
  id: string;
  studentUid: string;
  universityRollNo: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  branch: string;
  yearOfStudy: number;
  qualification?: string;
  academicYear?: string;
  isActive: boolean;
}

interface BatchRow {
  id: string;
  batchCode: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  trainingMode?: string;
  location?: string;
  maxCapacity: number;
  course: { id: string; code: string; title: string; durationHours?: number };
  trainer: { id: string; trainerCode: string; fullName: string; specialization: string } | null;
  enrollments: Array<{
    id: string;
    progressPercent: number;
    status: string;
    student: {
      id: string;
      studentUid: string;
      universityRollNo: string;
      fullName: string;
      branch: string;
    };
  }>;
}

export function CollegeAdminWorkspace({
  user,
  onLogout,
  onRefreshUser,
}: {
  user: CurrentUser;
  onLogout: () => void;
  onRefreshUser: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<{
    stats: Record<string, number>;
    charts?: {
      batchStatus: Array<{ label: string; count: number }>;
      courseDistribution: Array<{ code: string; title: string; count: number }>;
      attendanceTrend: Array<{ date: string; rate: number }>;
    };
    batches: BatchRow[];
    recentActivities?: Array<{
      id: string;
      action: string;
      entityType: string;
      actorEmail: string;
      createdAt: string;
    }>;
  } | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(25);
  const [studentPagination, setStudentPagination] = useState({ total: 0, totalPages: 1 });

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [courses, setCourses] = useState<
    Array<{ id: string; code: string; title: string; sector: string; durationHours: number; level: string }>
  >([]);
  const [trainers, setTrainers] = useState<
    Array<{ id: string; trainerCode: string; fullName: string; specialization: string; email: string; qualification: string }>
  >([]);

  // Student form
  const [newStudent, setNewStudent] = useState({
    fullName: "",
    universityRollNo: "",
    email: "",
    phone: "",
    gender: "Male",
    branch: "CSE",
    yearOfStudy: 3,
    qualification: "B.Tech",
    aadhaarLast4: "",
  });

  // Batch form
  const [newBatch, setNewBatch] = useState({
    batchCode: "",
    name: "",
    courseId: "",
    startDate: "2026-11-20",
    endDate: "2027-02-20",
    maxCapacity: 60,
    trainingMode: "Offline",
    location: "Campus Skill Lab",
  });

  // Enrollment
  const [enrollBatchId, setEnrollBatchId] = useState("");
  const [enrollStudentId, setEnrollStudentId] = useState("");

  // Attendance state
  const [attBatchId, setAttBatchId] = useState("");
  const [attDate, setAttDate] = useState("2026-11-16");
  const [attSessionsCount, setAttSessionsCount] = useState(0);
  const [attRoster, setAttRoster] = useState<
    Array<{
      student: {
        id: string;
        studentUid: string;
        universityRollNo: string;
        fullName: string;
        branch: string;
        status?: string;
      };
      progressPercent: number;
      status: string;
      remarks: string;
      summary: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        totalConductedSessions: number;
        attendancePercent: number;
      };
    }>
  >([]);

  // Reports preview
  const [reportType, setReportType] = useState("students");
  const [datePreset, setDatePreset] = useState("all");
  const [customStart, setCustomStart] = useState("2026-04-01");
  const [customEnd, setCustomEnd] = useState("2026-09-30");
  const [reportPreview, setReportPreview] = useState<{
    title: string;
    headers: string[];
    rows: Array<Array<string | number | boolean | null>>;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      setDashboard(await res.json());
    }
  }, []);

  const loadStudents = useCallback(async (q = "", page = 1, pageSize = 25) => {
    const res = await fetch(
      `/api/students?search=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`
    );
    if (res.ok) {
      const data = await res.json();
      setStudents(data.students || []);
      if (data.pagination) {
        setStudentPagination({
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      }
    }
  }, []);

  const loadBatchesAndCatalog = useCallback(async () => {
    const [bRes, cRes, tRes] = await Promise.all([
      fetch("/api/batches"),
      fetch("/api/courses"),
      fetch("/api/trainers"),
    ]);
    if (bRes.ok) {
      const bData = await bRes.json();
      setBatches(bData.batches || []);
      if (bData.batches?.length && !attBatchId) {
        setAttBatchId(bData.batches[0].id);
      }
      if (bData.batches?.length && !enrollBatchId) {
        setEnrollBatchId(bData.batches[0].id);
      }
    }
    if (cRes.ok) {
      const cData = await cRes.json();
      setCourses(cData.courses || []);
      if (cData.courses?.length && !newBatch.courseId) {
        setNewBatch((prev) => ({ ...prev, courseId: cData.courses[0].id }));
      }
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      setTrainers(tData.trainers || []);
    }
  }, [attBatchId, enrollBatchId, newBatch.courseId]);

  useEffect(() => {
    loadDashboard();
    loadStudents("", 1, studentPageSize);
    loadBatchesAndCatalog();
  }, [loadDashboard, loadStudents, loadBatchesAndCatalog, studentPageSize]);

  const loadAttendance = useCallback(async (batchId: string, date: string) => {
    if (!batchId) return;
    const res = await fetch(`/api/attendance?batchId=${batchId}&date=${date}`);
    if (res.ok) {
      const data = await res.json();
      setAttRoster(data.roster || []);
      setAttSessionsCount(data.totalConductedSessions || 0);
    }
  }, []);

  useEffect(() => {
    if (tab === "attendance" && attBatchId) {
      loadAttendance(attBatchId, attDate);
    }
  }, [tab, attBatchId, attDate, loadAttendance]);

  const loadReportPreview = useCallback(async () => {
    const params = new URLSearchParams({
      type: reportType,
      datePreset,
      format: "json",
      ...(datePreset === "custom" ? { startDate: customStart, endDate: customEnd } : {}),
    });
    const res = await fetch(`/api/reports?${params.toString()}`);
    if (res.ok) {
      setReportPreview(await res.json());
    }
  }, [reportType, datePreset, customStart, customEnd]);

  useEffect(() => {
    if (tab === "reports") {
      loadReportPreview();
    }
  }, [tab, loadReportPreview]);

  async function handleRegisterStudent(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || "Failed to register student");
    } else {
      setNotice(`Registered student ${data.student.fullName} (Immutable LMS ID: ${data.student.studentUid}).`);
      setNewStudent({
        fullName: "",
        universityRollNo: "",
        email: "",
        phone: "",
        gender: "Male",
        branch: "CSE",
        yearOfStudy: 3,
        qualification: "B.Tech",
        aadhaarLast4: "",
      });
      loadStudents(studentSearch, studentPage, studentPageSize);
      loadDashboard();
    }
  }

  async function toggleStudentStatus(s: StudentRow) {
    if (
      s.isActive &&
      typeof window !== "undefined" &&
      !window.confirm(`Are you sure you want to deactivate this student (${s.fullName})?`)
    ) {
      return;
    }
    const res = await fetch("/api/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
    });
    if (res.ok) {
      setNotice(`${s.fullName} ${s.isActive ? "deactivated" : "restored"}.`);
      loadStudents(studentSearch, studentPage, studentPageSize);
      loadDashboard();
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBatch),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || "Failed to create batch");
    } else {
      setNotice(`Created batch ${data.batch.batchCode}.`);
      setNewBatch((prev) => ({ ...prev, batchCode: "", name: "" }));
      loadBatchesAndCatalog();
      loadDashboard();
    }
  }

  async function handleEnrollStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollBatchId || !enrollStudentId) return;
    const res = await fetch("/api/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: enrollBatchId,
        action: "ENROLL_STUDENT",
        studentId: enrollStudentId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || "Enrollment failed");
    } else {
      setNotice("Student enrolled into batch.");
      loadBatchesAndCatalog();
      loadDashboard();
    }
  }

  async function handleUpdateProgress(batchId: string, studentId: string, progressPercent: number) {
    const res = await fetch("/api/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: batchId,
        action: "UPDATE_PROGRESS",
        studentId,
        progressPercent,
      }),
    });
    if (res.ok) {
      setNotice("Training progress updated.");
      loadBatchesAndCatalog();
      loadDashboard();
    }
  }

  async function handleSaveAttendance() {
    if (!attBatchId || attRoster.length === 0) return;
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: attBatchId,
        date: attDate,
        records: attRoster.map((r) => ({
          studentId: r.student.id,
          status: r.status,
          remarks: r.remarks,
        })),
      }),
    });
    if (res.ok) {
      setNotice(`Attendance saved for ${attDate}.`);
      loadAttendance(attBatchId, attDate);
      loadDashboard();
    } else {
      const data = await res.json();
      setNotice(data.error || "Failed to save attendance");
    }
  }

  const navItems: Array<{ id: Tab; label: string; icon: React.ReactNode; visible: boolean }> = [
    { id: "overview", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, visible: can(user, "dashboard:institution") },
    { id: "students", label: "Student List", icon: <Users className="w-4 h-4" />, visible: canAny(user, ["students:read", "students:manage"]) },
    { id: "import_students", label: "Import Students", icon: <Upload className="w-4 h-4" />, visible: can(user, "students:manage") },
    { id: "batches", label: "Batches & Enrollment", icon: <Layers className="w-4 h-4" />, visible: canAny(user, ["batches:read", "batches:manage"]) },
    { id: "courses_trainers", label: "Courses & Trainers", icon: <BookOpen className="w-4 h-4" />, visible: canAny(user, ["courses:read", "trainers:read"]) },
    { id: "attendance", label: "Attendance", icon: <ClipboardCheck className="w-4 h-4" />, visible: canAny(user, ["attendance:read", "attendance:mark"]) },
    { id: "reports", label: "Reports", icon: <FileBarChart className="w-4 h-4" />, visible: canAny(user, ["reports:read", "reports:export"]) },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, visible: true },
    { id: "profile", label: "My Profile & Password", icon: <UserCog className="w-4 h-4" />, visible: true },
  ];

  return (
    <div className="min-h-screen flex bg-white text-[#0F3D2E]">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0F3D2E]/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* Sidebar — Deep Forest Green (Collapsible on mobile/tablet) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F3D2E] text-white flex flex-col shrink-0 transform transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandEmblem variant="light" size={36} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/75 font-semibold">
                AP Skill Dev LMS
              </p>
              <p className="text-sm font-bold truncate">College Workspace</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 rounded border border-white/30 text-white"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {user.institution && (
          <div className="mx-3 mt-3 p-3 rounded border border-white/20 bg-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">
              Your College
            </p>
            <p className="text-xs font-bold mt-0.5 leading-snug">
              {user.institution.name}
            </p>
            <p className="text-[11px] text-white/75 mt-1">
              {user.institution.code} • {user.institution.district}
            </p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-white text-[#0F3D2E]"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-white/15 space-y-3">
          <div className="text-xs">
            <p className="font-bold truncate">{user.fullName}</p>
            <p className="text-white/70 truncate text-[11px]">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-white/40 text-xs font-semibold hover:bg-white hover:text-[#0F3D2E] transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Section 20 Header */}
        <header className="h-14 border-b border-[#0F3D2E]/20 px-4 sm:px-6 flex items-center justify-between bg-white gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded border border-[#0F3D2E]/30 text-[#0F3D2E]"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Shield className="w-4 h-4 shrink-0 hidden sm:block" />
            <span className="truncate">
              {user.institution?.name} ({user.institution?.code})
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-[#0F3D2E]/75">
              <Clock className="w-3.5 h-3.5" />
              Last Login:{" "}
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "First Session"}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-1 border border-[#0F3D2E]/30 rounded text-[11px] font-bold"
              title="Recent institution activities"
            >
              <Bell className="w-3.5 h-3.5" />
              {dashboard?.recentActivities?.length || 0}
            </span>
            <button
              onClick={() => setTab("profile")}
              className="px-2.5 py-1 rounded bg-[#0F3D2E] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer"
            >
              {user.fullName.split(" ")[0]} • {user.role}
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <NoticeBanner message={notice} onClose={() => setNotice("")} />

          {tab === "overview" && dashboard && (
            <div className="space-y-6">
              <SectionHeader
                title="College Dashboard"
                subtitle="Overview of your college's students, training batches, attendance, and recent updates"
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTab("students")}
                      className="px-3 py-1.5 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer"
                    >
                      + Add Student
                    </button>
                    <button
                      onClick={() => setTab("batches")}
                      className="px-3 py-1.5 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                    >
                      + Create Batch
                    </button>
                    <button
                      onClick={() => setTab("attendance")}
                      className="px-3 py-1.5 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                    >
                      Mark Attendance
                    </button>
                    <button
                      onClick={() => setTab("reports")}
                      className="px-3 py-1.5 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                    >
                      View Reports
                    </button>
                  </div>
                }
              />

              {/* 8 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={dashboard.stats.totalStudents} icon={<Users className="w-5 h-5" />} />
                <StatCard label="Active Students" value={dashboard.stats.activeStudents} icon={<CheckCircle2 className="w-5 h-5" />} />
                <StatCard label="Active Batches" value={dashboard.stats.activeBatches} icon={<Layers className="w-5 h-5" />} />
                <StatCard label="Completed Batches" value={dashboard.stats.completedBatches} icon={<Layers className="w-5 h-5" />} />
                <StatCard label="Active Courses" value={dashboard.stats.assignedCourses} icon={<BookOpen className="w-5 h-5" />} />
                <StatCard label="Assigned Trainers" value={dashboard.stats.assignedTrainers} icon={<UserCog className="w-5 h-5" />} />
                <StatCard label="Today's Attendance" value={`${dashboard.stats.todaysAttendance}%`} icon={<ClipboardCheck className="w-5 h-5" />} />
                <StatCard
                  label="Average Attendance"
                  value={`${dashboard.stats.attendanceRate}%`}
                  subtext={`Completion Rate: ${dashboard.stats.completionRate}%`}
                  icon={<FileBarChart className="w-5 h-5" />}
                />
              </div>

              {/* Charts Row (Strictly Deep Forest Green & White) */}
              {dashboard.charts && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider">Batch Status Distribution</p>
                    {dashboard.charts.batchStatus.map((item) => {
                      const pct =
                        dashboard.stats.totalBatches > 0
                          ? Math.round((item.count / dashboard.stats.totalBatches) * 100)
                          : 0;
                      return (
                        <div key={item.label} className="space-y-1 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span>{item.label}</span>
                            <span>{item.count} ({pct}%)</span>
                          </div>
                          <div className="h-2.5 border border-[#0F3D2E] rounded bg-white overflow-hidden">
                            <div className="h-full bg-[#0F3D2E]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider">Course Enrollment Distribution</p>
                    {dashboard.charts.courseDistribution.map((c) => {
                      const max = Math.max(1, ...dashboard.charts!.courseDistribution.map((x) => x.count));
                      const pct = Math.round((c.count / max) * 100);
                      return (
                        <div key={c.code} className="space-y-1 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="truncate">{c.code}</span>
                            <span>{c.count} students</span>
                          </div>
                          <div className="h-2.5 border border-[#0F3D2E] rounded bg-white overflow-hidden">
                            <div className="h-full bg-[#0F3D2E]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider">Attendance Trend (Recent Sessions)</p>
                    {dashboard.charts.attendanceTrend.map((pt) => (
                      <div key={pt.date} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="font-mono">{pt.date}</span>
                          <span>{pt.rate}%</span>
                        </div>
                        <div className="h-2.5 border border-[#0F3D2E] rounded bg-white overflow-hidden">
                          <div className="h-full bg-[#0F3D2E]" style={{ width: `${pt.rate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Institution Training Batches
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#0F3D2E]/20 bg-[#0F3D2E]/5">
                        <tr>
                          <th className="p-3 font-bold">Batch Code</th>
                          <th className="p-3 font-bold">Batch Name</th>
                          <th className="p-3 font-bold">Course</th>
                          <th className="p-3 font-bold">Trainer</th>
                          <th className="p-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0F3D2E]/15">
                        {dashboard.batches.map((b) => (
                          <tr key={b.id} className="hover:bg-[#0F3D2E]/5">
                            <td className="p-3 font-mono font-bold">{b.batchCode}</td>
                            <td className="p-3 font-semibold">{b.name}</td>
                            <td className="p-3">{b.course.code}</td>
                            <td className="p-3">{b.trainer?.fullName || "Pending"}</td>
                            <td className="p-3">
                              <StatusBadge active={b.status === "ACTIVE"} activeLabel={b.status} inactiveLabel={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Recent Institution Activities
                  </div>
                  <div className="divide-y divide-[#0F3D2E]/15 max-h-72 overflow-y-auto">
                    {(dashboard.recentActivities || []).map((act) => (
                      <div key={act.id} className="p-3 text-xs">
                        <p className="font-bold">{act.action}</p>
                        <p className="text-[11px] text-[#0F3D2E]/75">
                          {act.entityType} • {act.actorEmail}
                        </p>
                        <p className="text-[10px] text-[#0F3D2E]/60">
                          {new Date(act.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "students" && (
            <div className="space-y-6">
              <SectionHeader
                title="College Students"
                subtitle="Register, search, and manage students enrolled at your college"
              />

              {can(user, "students:manage") && (
                <form
                  onSubmit={handleRegisterStudent}
                  className="p-5 border border-[#0F3D2E]/25 rounded-lg bg-white space-y-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Register New Student
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      required
                      placeholder="Full Name"
                      value={newStudent.fullName}
                      onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      required
                      placeholder="University Reg No (e.g. 2026123456)"
                      value={newStudent.universityRollNo}
                      onChange={(e) => setNewStudent({ ...newStudent, universityRollNo: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      placeholder="Mobile Number"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <select
                      value={newStudent.branch}
                      onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="IT">IT</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                    <select
                      value={newStudent.yearOfStudy}
                      onChange={(e) => setNewStudent({ ...newStudent, yearOfStudy: Number(e.target.value) })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                    <input
                      maxLength={4}
                      placeholder="Aadhaar Last 4 Digits (Optional)"
                      value={newStudent.aadhaarLast4}
                      onChange={(e) => setNewStudent({ ...newStudent, aadhaarLast4: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] transition cursor-pointer"
                    >
                      Register Student
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#0F3D2E]/60" />
                  <input
                    placeholder="Search by LMS ID, Univ Reg No, name, or mobile..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setStudentPage(1);
                      loadStudents(e.target.value, 1, studentPageSize);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>Page Size:</span>
                  <select
                    value={studentPageSize}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      setStudentPageSize(size);
                      setStudentPage(1);
                      loadStudents(studentSearch, 1, size);
                    }}
                    className="px-2 py-1 border border-[#0F3D2E]/40 rounded bg-white"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="font-semibold">
                    {studentPagination.total} total
                  </span>
                </div>
              </div>

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F3D2E] text-white">
                      <tr>
                        <th className="p-3 font-bold">Student ID</th>
                        <th className="p-3 font-bold">University Reg. No.</th>
                        <th className="p-3 font-bold">Full Name</th>
                        <th className="p-3 font-bold">Course / Yr</th>
                        <th className="p-3 font-bold">Email</th>
                        <th className="p-3 font-bold">Status</th>
                        <th className="p-3 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0F3D2E]/15">
                      {students.map((s) => (
                        <tr key={s.id} className="hover:bg-[#0F3D2E]/5">
                          <td className="p-3 font-mono font-bold">{s.studentUid}</td>
                          <td className="p-3 font-mono">{s.universityRollNo}</td>
                          <td className="p-3 font-semibold">{s.fullName}</td>
                          <td className="p-3">{s.branch} • Y{s.yearOfStudy}</td>
                          <td className="p-3">{s.email}</td>
                          <td className="p-3"><StatusBadge active={s.isActive} /></td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedStudentId(s.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F3D2E] text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <button
                              onClick={() => toggleStudentStatus(s)}
                              className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white transition cursor-pointer"
                            >
                              {s.isActive ? "Deactivate" : "Restore"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "batches" && (
            <div className="space-y-6">
              <SectionHeader
                title="Batches &amp; Student Enrollment"
                subtitle="Create training batches for your assigned courses and add your college's students"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleCreateBatch}
                  className="p-5 border border-[#0F3D2E]/25 rounded-lg space-y-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wider">Create New Batch</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Batch Code (blank = auto BAT-...)"
                      value={newBatch.batchCode}
                      onChange={(e) => setNewBatch({ ...newBatch, batchCode: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      required
                      placeholder="Batch Name"
                      value={newBatch.name}
                      onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      required
                      value={newBatch.courseId}
                      onChange={(e) => setNewBatch({ ...newBatch, courseId: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newBatch.trainingMode}
                      onChange={(e) => setNewBatch({ ...newBatch, trainingMode: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="Offline">Offline</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="date"
                      value={newBatch.startDate}
                      onChange={(e) => setNewBatch({ ...newBatch, startDate: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      type="date"
                      value={newBatch.endDate}
                      onChange={(e) => setNewBatch({ ...newBatch, endDate: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                    <input
                      placeholder="Location"
                      value={newBatch.location}
                      onChange={(e) => setNewBatch({ ...newBatch, location: e.target.value })}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] transition cursor-pointer"
                  >
                    Create Batch
                  </button>
                </form>

                <form
                  onSubmit={handleEnrollStudent}
                  className="p-5 border border-[#0F3D2E]/25 rounded-lg space-y-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Enroll Institution Student into Batch
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Select Batch</label>
                    <select
                      required
                      value={enrollBatchId}
                      onChange={(e) => setEnrollBatchId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} — {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Select Student</label>
                    <select
                      required
                      value={enrollStudentId}
                      onChange={(e) => setEnrollStudentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="">-- Choose Student --</option>
                      {students
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.studentUid} | {s.universityRollNo} — {s.fullName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] transition cursor-pointer"
                  >
                    Enroll Student
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {batches.map((b) => (
                  <div key={b.id} className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#0F3D2E] text-white flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono font-bold mr-2">
                          <button
                            onClick={() => setSelectedBatchId(b.id)}
                            className="underline hover:opacity-80 cursor-pointer"
                          >
                            {b.batchCode}
                          </button>
                        </span>
                        <span className="font-semibold">{b.name}</span>
                        <span className="ml-2 text-white/75">
                          ({b.course.title} • {b.trainingMode || "Offline"})
                        </span>
                      </div>
                      <span className="text-white/90">
                        Trainer: {b.trainer?.fullName || "Pending"} • Enrolled: {b.enrollments.length}/{b.maxCapacity}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/15">
                          <tr>
                            <th className="p-2.5 font-bold">LMS Student ID</th>
                            <th className="p-2.5 font-bold">Univ Reg No</th>
                            <th className="p-2.5 font-bold">Name</th>
                            <th className="p-2.5 font-bold">Training Progress</th>
                            <th className="p-2.5 font-bold">Update %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0F3D2E]/10">
                          {b.enrollments.map((en) => (
                            <tr key={en.id}>
                              <td className="p-2.5 font-mono">{en.student.studentUid}</td>
                              <td className="p-2.5 font-mono">{en.student.universityRollNo}</td>
                              <td className="p-2.5 font-semibold">{en.student.fullName}</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-28 h-2 border border-[#0F3D2E] rounded overflow-hidden bg-white">
                                    <div
                                      className="h-full bg-[#0F3D2E]"
                                      style={{ width: `${en.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="font-bold">{en.progressPercent}%</span>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1">
                                  {[25, 50, 75, 100].map((pct) => (
                                    <button
                                      key={pct}
                                      onClick={() => handleUpdateProgress(b.id, en.student.id, pct)}
                                      className="px-2 py-0.5 border border-[#0F3D2E]/40 rounded text-[10px] font-bold hover:bg-[#0F3D2E] hover:text-white transition cursor-pointer"
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "courses_trainers" && (
            <div className="space-y-6">
              <SectionHeader
                title="Assigned Courses & Trainers"
                subtitle="Courses approved for your institution and trainers assigned to your batches"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Assigned Courses ({courses.length})
                  </div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {courses.map((c) => (
                      <div key={c.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold">{c.code}</span>
                          <span className="px-2 py-0.5 border border-[#0F3D2E] rounded text-[10px] font-bold">
                            {c.durationHours} hrs • {c.level}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold">{c.title}</p>
                        <p className="text-xs text-[#0F3D2E]/75">{c.sector}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Assigned Trainers ({trainers.length})
                  </div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {trainers.map((t) => (
                      <div key={t.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold">{t.trainerCode}</span>
                          <span className="text-[11px] font-semibold">{t.specialization}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold">{t.fullName}</p>
                        <p className="text-xs text-[#0F3D2E]/75">
                          {t.qualification} • {t.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "attendance" && (
            <div className="space-y-6">
              <SectionHeader
                title="Batch Attendance"
                subtitle="Mark daily attendance and track each student's overall attendance percentage"
              />

              <div className="flex flex-wrap items-end justify-between gap-4 p-4 border border-[#0F3D2E]/25 rounded-lg">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase mb-1">Batch</label>
                    <select
                      value={attBatchId}
                      onChange={(e) => setAttBatchId(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white min-w-[260px]"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} — {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase mb-1">Session Date</label>
                    <input
                      type="date"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                    />
                  </div>
                  <button
                    onClick={handleSaveAttendance}
                    className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] transition cursor-pointer"
                  >
                    Save Attendance
                  </button>
                </div>
                <div className="text-xs font-bold px-3 py-1.5 border border-[#0F3D2E] rounded">
                  Total Conducted Sessions: {attSessionsCount}
                </div>
              </div>

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F3D2E] text-white">
                      <tr>
                        <th className="p-3 font-bold">Student Name &amp; ID</th>
                        <th className="p-3 font-bold">Attendance %</th>
                        <th className="p-3 font-bold">Present</th>
                        <th className="p-3 font-bold">Absent</th>
                        <th className="p-3 font-bold">Late</th>
                        <th className="p-3 font-bold">Sessions</th>
                        <th className="p-3 font-bold">Mark ({attDate})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0F3D2E]/15">
                      {attRoster.map((row, idx) => (
                        <tr key={row.student.id} className="hover:bg-[#0F3D2E]/5">
                          <td className="p-3">
                            <p className="font-semibold">{row.student.fullName}</p>
                            <p className="font-mono text-[11px] text-[#0F3D2E]/75">
                              {row.student.studentUid} • {row.student.universityRollNo}
                            </p>
                          </td>
                          <td className="p-3 font-bold">
                            {row.summary.attendancePercent}%
                          </td>
                          <td className="p-3 font-bold">{row.summary.present}</td>
                          <td className="p-3">{row.summary.absent}</td>
                          <td className="p-3">{row.summary.late}</td>
                          <td className="p-3">{row.summary.totalConductedSessions}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    const next = [...attRoster];
                                    next[idx] = { ...row, status: st };
                                    setAttRoster(next);
                                  }}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                    row.status === st
                                      ? "bg-[#0F3D2E] text-white"
                                      : "border border-[#0F3D2E]/40 text-[#0F3D2E] hover:border-[#0F3D2E]"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {attRoster.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-[#0F3D2E]/60">
                            No students enrolled in this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-6">
              <SectionHeader
                title="College Reports &amp; Downloads"
                subtitle="View and download student, batch, attendance, and certificate reports for your college"
                action={
                  can(user, "reports:export") ? (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/reports?type=${reportType}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=csv`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20]"
                      >
                        <Download className="w-3.5 h-3.5" /> CSV
                      </a>
                      <a
                        href={`/api/reports?type=${reportType}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=excel`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white"
                      >
                        <Download className="w-3.5 h-3.5" /> Excel
                      </a>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`/api/reports?type=${reportType}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=pdf`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white"
                      >
                        Print / PDF
                      </a>
                    </div>
                  ) : undefined
                }
              />

              <div className="flex flex-wrap items-center gap-3 p-4 border border-[#0F3D2E]/25 rounded-lg">
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white font-semibold">
                  <option value="students">Student Report</option>
                  <option value="batches">Batch Report</option>
                  <option value="attendance">Attendance Report</option>
                  <option value="enrollment">Enrollment Report</option>
                  <option value="completion">Completion Report</option>
                  <option value="certificate">Certificate Report</option>
                </select>
                <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
                {datePreset === "custom" && (
                  <>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2.5 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2.5 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  </>
                )}
              </div>

              {reportPreview && (
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0F3D2E] text-white text-xs font-bold flex justify-between">
                    <span>{reportPreview.title} ({user.institution?.code})</span>
                    <span>{reportPreview.rows.length} rows</span>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/20">
                        <tr>
                          {reportPreview.headers.map((h) => (
                            <th key={h} className="p-2.5 font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0F3D2E]/10">
                        {reportPreview.rows.slice(0, 50).map((r, idx) => (
                          <tr key={idx} className="hover:bg-[#0F3D2E]/5">
                            {r.map((cell, ci) => (
                              <td key={ci} className="p-2.5 whitespace-nowrap">{String(cell ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "import_students" && (
            <ImportStudentsPanel
              onImported={() => {
                loadStudents(studentSearch, studentPage, studentPageSize);
                loadDashboard();
              }}
            />
          )}

          {tab === "notifications" && (
            <NotificationCenterPanel onUnreadChange={setUnreadNotifications} />
          )}

          {tab === "profile" && (
            <ProfilePanel user={user} onRefreshUser={onRefreshUser} />
          )}

          {selectedStudentId && (
            <StudentProfileModal
              studentId={selectedStudentId}
              onClose={() => setSelectedStudentId(null)}
            />
          )}

          {selectedBatchId && (
            <BatchDetailsModal
              batchId={selectedBatchId}
              onClose={() => setSelectedBatchId(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
