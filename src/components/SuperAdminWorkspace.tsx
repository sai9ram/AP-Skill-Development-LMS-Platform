"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  Building2,
  GraduationCap,
  UserCheck,
  BookOpen,
  Layers,
  Users,
  FileBarChart,
  Settings,
  UserCog,
  LogOut,
  Download,
  ShieldCheck,
  KeyRound,
  Bell,
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
import { RbacManagementPanel } from "./RbacManagementPanel";
import { NotificationCenterPanel } from "./NotificationCenterPanel";
import { StudentProfileModal } from "./StudentProfileModal";
import { BatchDetailsModal } from "./BatchDetailsModal";
import { ImportStudentsPanel } from "./ImportStudentsPanel";

type SuperTab =
  | "overview"
  | "search"
  | "institutions"
  | "universities"
  | "admins"
  | "courses_trainers"
  | "batches_monitor"
  | "students"
  | "import_students"
  | "reports"
  | "notifications"
  | "rbac"
  | "governance"
  | "profile";

export function SuperAdminWorkspace({
  user,
  onLogout,
  onRefreshUser,
}: {
  user: CurrentUser;
  onLogout: () => void;
  onRefreshUser: () => void;
}) {
  const [tab, setTab] = useState<SuperTab>("overview");
  const [notice, setNotice] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [dashboard, setDashboard] = useState<{
    stats: Record<string, number>;
    analytics?: {
      districtInstitutions: Array<{ label: string; count: number }>;
      districtStudents: Array<{ label: string; count: number }>;
      universityStudents: Array<{ label: string; count: number }>;
      institutionEnrollment: Array<{ code: string; name: string; students: number; batches: number; enrollments: number }>;
      coursePopularity: Array<{ code: string; title: string; count: number }>;
      batchStatus: Array<{ label: string; count: number }>;
      trainerAllocation: Array<{ name: string; code: string; batches: number }>;
      attendanceTrends: Array<{ date: string; rate: number }>;
      completionTrends: { completed: number; inProgress: number; rate: number };
      certificateStats: { total: number; issued: number; pending: number; revoked: number };
    };
    alerts?: Array<{ severity: string; message: string }>;
    filterOptions?: {
      districts: string[];
      universities: Array<{ id: string; code: string; name: string }>;
      institutions: Array<{ id: string; code: string; name: string }>;
      courses: Array<{ id: string; code: string; title: string }>;
      batches: Array<{ id: string; code: string; name: string }>;
      trainers: Array<{ id: string; code: string; name: string }>;
      academicYears: string[];
    };
    institutions: Array<{
      id: string;
      name: string;
      code: string;
      district: string;
      city: string;
      isActive: boolean;
      university: { code: string; name: string };
      _count: { students: number; batches: number; admins: number; institutionCourses: number };
    }>;
    recentAudits: Array<{
      id: string;
      action: string;
      actorEmail: string;
      actorRole: string;
      entityType: string;
      createdAt: string;
    }>;
  } | null>(null);

  const [dashFilters, setDashFilters] = useState({
    district: "ALL",
    universityId: "ALL",
    institutionId: "ALL",
    courseId: "ALL",
    batchId: "ALL",
    trainerId: "ALL",
    gender: "ALL",
    academicYear: "ALL",
    trainingStatus: "ALL",
  });

  const [globalQuery, setGlobalQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"contains" | "prefix" | "exact">("contains");
  const [searchEntity, setSearchEntity] = useState("ALL");
  const [searchPage, setSearchPage] = useState(1);
  const [searchPageSize, setSearchPageSize] = useState(25);
  const [searchResults, setSearchResults] = useState<{
    institutions: Array<{ id: string; name: string; code: string; district: string; isActive: boolean }>;
    universities?: Array<{ id: string; name: string; code: string; district: string }>;
    students: Array<{
      id: string;
      fullName: string;
      studentUid: string;
      universityRollNo: string;
      status: string;
      university?: { code: string; name: string };
      institution: { name: string; code?: string };
      enrollments?: Array<{
        status: string;
        batch: { batchCode: string; name: string; course: { code: string; title: string } };
      }>;
    }>;
    courses: Array<{ id: string; code: string; title: string; sector: string }>;
    trainers: Array<{ id: string; trainerCode: string; fullName: string; specialization: string }>;
    batches: Array<{ id: string; batchCode: string; name: string; institution: { name: string } }>;
    admins?: Array<{ id: string; username: string | null; fullName: string; email: string }>;
  } | null>(null);

  const [institutions, setInstitutions] = useState<
    Array<{
      id: string;
      name: string;
      code: string;
      district: string;
      city: string;
      principalName: string;
      isActive: boolean;
      university: { id: string; code: string; name: string };
      _count: { students: number; batches: number; admins: number };
    }>
  >([]);
  const [instFilter, setInstFilter] = useState("");

  const [universities, setUniversities] = useState<
    Array<{ id: string; name: string; code: string; district: string; isActive: boolean; _count: { institutions: number } }>
  >([]);
  const [admins, setAdmins] = useState<
    Array<{
      id: string;
      username: string | null;
      fullName: string;
      email: string;
      designation: string;
      isActive: boolean;
      mustChangePassword: boolean;
      institution: { id: string; name: string; code: string } | null;
    }>
  >([]);
  const [courses, setCourses] = useState<
    Array<{ id: string; code: string; title: string; sector: string; durationHours: number; level: string; isActive: boolean }>
  >([]);
  const [trainers, setTrainers] = useState<
    Array<{ id: string; trainerCode: string; fullName: string; email: string; specialization: string; isActive: boolean; _count: { batches: number } }>
  >([]);
  const [batches, setBatches] = useState<
    Array<{
      id: string;
      batchCode: string;
      name: string;
      status: string;
      isActive: boolean;
      institution: { id: string; name: string; code: string };
      course: { code: string; title: string };
      trainer: { id: string; fullName: string } | null;
      enrollments: Array<unknown>;
    }>
  >([]);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      studentUid: string;
      universityRollNo: string;
      fullName: string;
      email: string;
      branch: string;
      yearOfStudy: number;
      isActive: boolean;
      institution: { name: string; code: string };
    }>
  >([]);
  const [governance, setGovernance] = useState<{
    configs: Array<{ id: string; key: string; value: string; category: string; description: string }>;
    permissions: Array<{
      id: string;
      enabled: boolean;
      role: { id: string; key: string; name: string };
      permission: { id: string; key: string; label: string; module: string };
    }>;
    auditLogs: Array<{ id: string; actorEmail: string; actorRole: string; action: string; entityType: string; detailsJson: string; createdAt: string }>;
  } | null>(null);

  // Forms
  const [newInst, setNewInst] = useState({
    name: "",
    code: "",
    universityId: "",
    institutionType: "Engineering College",
    district: "",
    mandal: "",
    city: "",
    pincode: "",
    contactPerson: "",
    contactMobile: "",
    principalName: "",
    status: "ACTIVE",
  });
  const [newUniv, setNewUniv] = useState({ name: "", code: "", district: "" });
  const [newAdmin, setNewAdmin] = useState({
    fullName: "",
    email: "",
    phone: "",
    institutionId: "",
    tempPassword: "",
    designation: "College Skill Coordinator",
  });
  const [provisioningInst, setProvisioningInst] = useState<{
    id: string;
    name: string;
    code: string;
    district: string;
  } | null>(null);
  const [provisionedCreds, setProvisionedCreds] = useState<{
    adminId: string;
    username: string;
    tempPassword: string;
    institutionCode: string;
    institutionName: string;
    accountStatus: string;
  } | null>(null);
  const [newCourse, setNewCourse] = useState({
    code: "",
    title: "",
    sector: "",
    durationHours: 120,
    level: "INTERMEDIATE",
    description: "",
  });
  const [newTrainer, setNewTrainer] = useState({
    trainerCode: "",
    fullName: "",
    email: "",
    phone: "",
    specialization: "",
    qualification: "",
  });
  const [reportType, setReportType] = useState("students");
  const [reportInstId, setReportInstId] = useState("ALL");
  const [datePreset, setDatePreset] = useState("all");
  const [customStart, setCustomStart] = useState("2026-04-01");
  const [customEnd, setCustomEnd] = useState("2026-09-30");
  const [reportPreview, setReportPreview] = useState<{
    title: string;
    headers: string[];
    rows: Array<Array<string | number | boolean | null>>;
  } | null>(null);

  const loadDashboard = useCallback(async (filters = dashFilters) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (res.ok) setDashboard(await res.json());
  }, [dashFilters]);

  const loadReportPreview = useCallback(async () => {
    const params = new URLSearchParams({
      type: reportType,
      institutionId: reportInstId,
      datePreset,
      format: "json",
      ...(datePreset === "custom" ? { startDate: customStart, endDate: customEnd } : {}),
    });
    const res = await fetch(`/api/reports?${params.toString()}`);
    if (res.ok) setReportPreview(await res.json());
  }, [reportType, reportInstId, datePreset, customStart, customEnd]);

  useEffect(() => {
    if (tab === "reports") loadReportPreview();
  }, [tab, loadReportPreview]);

  const loadCoreLists = useCallback(async () => {
    const [iRes, uRes, aRes, cRes, tRes, bRes, sRes] = await Promise.all([
      fetch("/api/institutions"),
      fetch("/api/universities"),
      fetch("/api/admins"),
      fetch("/api/courses"),
      fetch("/api/trainers"),
      fetch("/api/batches"),
      fetch("/api/students"),
    ]);
    if (iRes.ok) {
      const d = await iRes.json();
      setInstitutions(d.institutions || []);
      if (d.institutions?.length && !newAdmin.institutionId) {
        setNewAdmin((p) => ({ ...p, institutionId: d.institutions[0].id }));
      }
    }
    if (uRes.ok) {
      const d = await uRes.json();
      setUniversities(d.universities || []);
      if (d.universities?.length && !newInst.universityId) {
        setNewInst((p) => ({ ...p, universityId: d.universities[0].id }));
      }
    }
    if (aRes.ok) setAdmins((await aRes.json()).admins || []);
    if (cRes.ok) setCourses((await cRes.json()).courses || []);
    if (tRes.ok) setTrainers((await tRes.json()).trainers || []);
    if (bRes.ok) setBatches((await bRes.json()).batches || []);
    if (sRes.ok) setStudents((await sRes.json()).students || []);
  }, [newAdmin.institutionId, newInst.universityId]);

  const loadGovernance = useCallback(async () => {
    const res = await fetch("/api/governance");
    if (res.ok) setGovernance(await res.json());
  }, []);

  useEffect(() => {
    loadDashboard();
    loadCoreLists();
    loadGovernance();
  }, [loadDashboard, loadCoreLists, loadGovernance]);

  async function runGlobalSearch(
    q: string,
    mode = searchMode,
    entity = searchEntity,
    page = searchPage,
    pageSize = searchPageSize
  ) {
    setGlobalQuery(q);
    if (q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&mode=${mode}&entity=${entity}&page=${page}&pageSize=${pageSize}`
    );
    if (res.ok) setSearchResults(await res.json());
  }

  async function createInstitution(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInst),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create institution");
    else {
      setNotice(`Institution ${d.institution.name} created.`);
      setNewInst((p) => ({ ...p, name: "", code: "", district: "", city: "", principalName: "" }));
      loadCoreLists();
      loadDashboard();
    }
  }

  async function toggleEntityStatus(endpoint: string, id: string, currentActive: boolean, label: string) {
    if (
      currentActive &&
      typeof window !== "undefined" &&
      !window.confirm(`Are you sure you want to deactivate ${label}?`)
    ) {
      return;
    }
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !currentActive }),
    });
    if (res.ok) {
      setNotice(`${label} ${currentActive ? "deactivated" : "restored"}.`);
      loadCoreLists();
      loadDashboard();
      loadGovernance();
    }
  }

  async function createUniversity(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/universities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUniv),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create university");
    else {
      setNotice(`University ${d.university.code} created.`);
      setNewUniv({ name: "", code: "", district: "" });
      loadCoreLists();
    }
  }

  async function createCollegeAdmin(e: React.FormEvent, activateImmediately = true) {
    e.preventDefault();
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAdmin, activateImmediately }),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create College Admin");
    else {
      setNotice(`College Admin ${d.credentials.username} (${d.credentials.accountStatus}) created.`);
      setProvisionedCreds({
        adminId: d.admin.id,
        ...d.credentials,
      });
      setNewAdmin((p) => ({ ...p, fullName: "", email: "", phone: "", tempPassword: "" }));
      loadCoreLists();
      loadGovernance();
    }
  }

  async function activateProvisionedAdmin(adminId: string) {
    const res = await fetch("/api/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: adminId, isActive: true }),
    });
    if (res.ok) {
      setNotice("College Admin account activated.");
      setProvisionedCreds((prev) =>
        prev ? { ...prev, accountStatus: "ACTIVE" } : null
      );
      loadCoreLists();
      loadGovernance();
    }
  }

  async function resetAdminPassword(id: string, email: string) {
    const res = await fetch("/api/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resetTempPassword: true }),
    });
    const d = await res.json();
    if (res.ok) {
      setNotice(
        `New temporary password generated for ${d.admin.username || email}: ${d.tempPassword}`
      );
      loadCoreLists();
      loadGovernance();
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create course");
    else {
      setNotice(`Course ${d.course.code} added.`);
      setNewCourse({ code: "", title: "", sector: "", durationHours: 120, level: "INTERMEDIATE", description: "" });
      loadCoreLists();
    }
  }

  async function createTrainer(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTrainer),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create trainer");
    else {
      setNotice(`Trainer ${d.trainer.fullName} added.`);
      setNewTrainer({ trainerCode: "", fullName: "", email: "", phone: "", specialization: "", qualification: "" });
      loadCoreLists();
    }
  }

  async function assignTrainerToBatch(batchId: string, trainerId: string) {
    const res = await fetch("/api/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: batchId, trainerId: trainerId || null }),
    });
    if (res.ok) {
      setNotice("Trainer assignment updated.");
      loadCoreLists();
      loadGovernance();
    }
  }

  async function assignCourseToInst(institutionId: string, courseId: string) {
    if (!courseId) return;
    const res = await fetch("/api/institutions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: institutionId, assignCourseId: courseId }),
    });
    if (res.ok) {
      setNotice("Course assigned to institution.");
      loadCoreLists();
    }
  }

  async function updateConfig(key: string, value: string) {
    const res = await fetch("/api/governance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONFIG", key, value }),
    });
    if (res.ok) {
      setNotice(`Configuration ${key} updated.`);
      loadGovernance();
    }
  }

  async function togglePermission(id: string, enabled: boolean) {
    const res = await fetch("/api/governance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PERMISSION", id, enabled: !enabled }),
    });
    if (res.ok) {
      setNotice("Access permission updated.");
      loadGovernance();
    }
  }

  const navItems: Array<{ id: SuperTab; group: string; label: string; icon: React.ReactNode; visible: boolean }> = [
    { id: "overview", group: "Dashboard", label: "Statewide Overview", icon: <LayoutDashboard className="w-4 h-4" />, visible: can(user, "dashboard:statewide") },
    { id: "search", group: "Dashboard", label: "Global Search", icon: <Search className="w-4 h-4" />, visible: can(user, "search:global") },
    { id: "universities", group: "Organization", label: "Universities", icon: <GraduationCap className="w-4 h-4" />, visible: can(user, "universities:manage") },
    { id: "institutions", group: "Organization", label: "Colleges & Institutions", icon: <Building2 className="w-4 h-4" />, visible: canAny(user, ["institutions:read", "institutions:manage"]) },
    { id: "admins", group: "Users & Access", label: "College Admins", icon: <UserCheck className="w-4 h-4" />, visible: can(user, "admins:manage") },
    { id: "rbac", group: "Users & Access", label: "Roles & Permissions", icon: <ShieldCheck className="w-4 h-4" />, visible: can(user, "governance:manage") },
    { id: "students", group: "Students", label: "Student Database", icon: <Users className="w-4 h-4" />, visible: canAny(user, ["students:read", "students:manage"]) },
    { id: "import_students", group: "Students", label: "Import Students", icon: <Upload className="w-4 h-4" />, visible: can(user, "students:manage") },
    { id: "courses_trainers", group: "Courses & Training", label: "Courses & Trainers", icon: <BookOpen className="w-4 h-4" />, visible: canAny(user, ["courses:read", "courses:manage", "trainers:read", "trainers:manage"]) },
    { id: "batches_monitor", group: "Courses & Training", label: "Batches & Assignments", icon: <Layers className="w-4 h-4" />, visible: canAny(user, ["batches:read", "batches:manage", "trainers:manage"]) },
    { id: "reports", group: "Reports", label: "State & Custom Reports", icon: <FileBarChart className="w-4 h-4" />, visible: canAny(user, ["reports:read", "reports:export"]) },
    { id: "notifications", group: "System", label: "Notifications", icon: <Bell className="w-4 h-4" />, visible: true },
    { id: "governance", group: "System", label: "Audit Logs & Settings", icon: <Settings className="w-4 h-4" />, visible: canAny(user, ["governance:manage", "audit:read"]) },
    { id: "profile", group: "System", label: "Profile & Security", icon: <UserCog className="w-4 h-4" />, visible: true },
  ];

  const activeNavItem = navItems.find((n) => n.id === tab);

  const filteredInstitutions = institutions.filter(
    (i) =>
      !instFilter ||
      i.name.toLowerCase().includes(instFilter.toLowerCase()) ||
      i.code.toLowerCase().includes(instFilter.toLowerCase()) ||
      i.district.toLowerCase().includes(instFilter.toLowerCase())
  );

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
              <p className="text-sm font-bold truncate">State Command</p>
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

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-white text-[#0F3D2E]"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
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
        <header className="h-14 border-b border-[#0F3D2E]/20 px-4 sm:px-6 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded border border-[#0F3D2E]/30 text-[#0F3D2E]"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <ShieldCheck className="w-4 h-4 hidden sm:block shrink-0" />
            <span className="hidden sm:inline">AP Skill Dev LMS</span>
            <span className="hidden sm:inline opacity-50">/</span>
            <span className="hidden md:inline opacity-75">{activeNavItem?.group || "Workspace"}</span>
            <span className="hidden md:inline opacity-50">/</span>
            <span className="font-bold truncate">{activeNavItem?.label || "Dashboard"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab("notifications")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#0F3D2E]/30 rounded text-xs font-bold hover:border-[#0F3D2E] cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifications}
            </button>
            <span className="px-2.5 py-1 rounded bg-[#0F3D2E] text-white text-[11px] font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 overflow-y-auto">
          <NoticeBanner message={notice} onClose={() => setNotice("")} />

          {tab === "overview" && dashboard && (
            <div className="space-y-6">
              <SectionHeader
                title="Statewide Overview"
                subtitle="View and manage colleges, universities, students, courses, trainers, and attendance across Andhra Pradesh"
              />

              {/* Section 22 Multi-Filter Bar */}
              {dashboard.filterOptions && (
                <div className="p-4 border border-[#0F3D2E]/25 rounded-lg bg-[#0F3D2E]/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider">
                      Dynamic Analytics Filters
                    </p>
                    <button
                      onClick={() => {
                        const reset = {
                          district: "ALL",
                          universityId: "ALL",
                          institutionId: "ALL",
                          courseId: "ALL",
                          batchId: "ALL",
                          trainerId: "ALL",
                          gender: "ALL",
                          academicYear: "ALL",
                          trainingStatus: "ALL",
                        };
                        setDashFilters(reset);
                        loadDashboard(reset);
                      }}
                      className="text-[11px] font-bold underline cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <select
                      value={dashFilters.district}
                      onChange={(e) => {
                        const next = { ...dashFilters, district: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">District: All AP</option>
                      {dashboard.filterOptions.districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.universityId}
                      onChange={(e) => {
                        const next = { ...dashFilters, universityId: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">University: All</option>
                      {dashboard.filterOptions.universities.map((u) => (
                        <option key={u.id} value={u.id}>{u.code}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.institutionId}
                      onChange={(e) => {
                        const next = { ...dashFilters, institutionId: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Institution: All</option>
                      {dashboard.filterOptions.institutions.map((i) => (
                        <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.courseId}
                      onChange={(e) => {
                        const next = { ...dashFilters, courseId: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Course: All</option>
                      {dashboard.filterOptions.courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.code}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.trainerId}
                      onChange={(e) => {
                        const next = { ...dashFilters, trainerId: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Trainer: All</option>
                      {dashboard.filterOptions.trainers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.gender}
                      onChange={(e) => {
                        const next = { ...dashFilters, gender: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Gender: All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={dashFilters.academicYear}
                      onChange={(e) => {
                        const next = { ...dashFilters, academicYear: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Academic Year: All</option>
                      {dashboard.filterOptions.academicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={dashFilters.trainingStatus}
                      onChange={(e) => {
                        const next = { ...dashFilters, trainingStatus: e.target.value };
                        setDashFilters(next);
                        loadDashboard(next);
                      }}
                      className="px-2.5 py-1.5 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                    >
                      <option value="ALL">Training Status: All</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PLANNED">PLANNED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 12 Top KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                <StatCard label="Total Universities" value={dashboard.stats.totalUniversities} icon={<GraduationCap className="w-4 h-4" />} />
                <StatCard label="Total Institutions" value={dashboard.stats.totalInstitutions} icon={<Building2 className="w-4 h-4" />} />
                <StatCard label="Active Institutions" value={dashboard.stats.activeInstitutions} icon={<Building2 className="w-4 h-4" />} />
                <StatCard label="College Admins" value={dashboard.stats.collegeAdmins} icon={<UserCheck className="w-4 h-4" />} />
                <StatCard label="Total Students" value={dashboard.stats.totalStudents} icon={<Users className="w-4 h-4" />} />
                <StatCard label="Active Students" value={dashboard.stats.activeStudents} icon={<Users className="w-4 h-4" />} />
                <StatCard label="Total Courses" value={dashboard.stats.totalCourses} icon={<BookOpen className="w-4 h-4" />} />
                <StatCard label="Active Courses" value={dashboard.stats.activeCourses} icon={<BookOpen className="w-4 h-4" />} />
                <StatCard label="Total Trainers" value={dashboard.stats.totalTrainers} icon={<UserCog className="w-4 h-4" />} />
                <StatCard label="Active Batches" value={dashboard.stats.activeBatches} icon={<Layers className="w-4 h-4" />} />
                <StatCard label="Completed Batches" value={dashboard.stats.completedBatches} icon={<Layers className="w-4 h-4" />} />
                <StatCard label="Attendance Rate" value={`${dashboard.stats.attendanceRate}%`} icon={<FileBarChart className="w-4 h-4" />} />
              </div>

              {/* Alerts & Exceptions */}
              {dashboard.alerts && dashboard.alerts.length > 0 && (
                <div className="border-2 border-[#0F3D2E] rounded-lg p-4 bg-[#0F3D2E]/5 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider">Alerts &amp; Exceptions</p>
                  {dashboard.alerts.map((al, i) => (
                    <p key={i} className="text-xs font-semibold">
                      [{al.severity}] {al.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Statewide Overview Analytics Grid */}
              {dashboard.analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-bold uppercase">District-Wise Institutions &amp; Students</p>
                    {dashboard.analytics.districtInstitutions.map((d) => {
                      const stuCount = dashboard.analytics!.districtStudents.find((s) => s.label === d.label)?.count || 0;
                      return (
                        <div key={d.label} className="flex justify-between text-xs py-1 border-b border-[#0F3D2E]/10">
                          <span className="font-semibold">{d.label}</span>
                          <span className="font-mono">{d.count} inst • {stuCount} stu</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-bold uppercase">University-Wise Students</p>
                    {dashboard.analytics.universityStudents.map((u) => (
                      <div key={u.label} className="flex justify-between text-xs py-1 border-b border-[#0F3D2E]/10">
                        <span className="font-mono font-bold">{u.label}</span>
                        <span>{u.count} students</span>
                      </div>
                    ))}
                  </div>
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-bold uppercase">Course Popularity &amp; Certificates</p>
                    {dashboard.analytics.coursePopularity.map((c) => (
                      <div key={c.code} className="flex justify-between text-xs py-1 border-b border-[#0F3D2E]/10">
                        <span className="font-mono font-bold">{c.code}</span>
                        <span>{c.count} enrolled</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[#0F3D2E]/20 text-xs flex justify-between font-bold">
                      <span>Certificates</span>
                      <span>
                        Issued: {dashboard.analytics.certificateStats.issued} • Pending: {dashboard.analytics.certificateStats.pending}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Institution-Level Statistics
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/20">
                        <tr>
                          <th className="p-3 font-bold">Code</th>
                          <th className="p-3 font-bold">Institution</th>
                          <th className="p-3 font-bold">District</th>
                          <th className="p-3 font-bold">Univ</th>
                          <th className="p-3 font-bold">Students</th>
                          <th className="p-3 font-bold">Batches</th>
                          <th className="p-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0F3D2E]/15">
                        {dashboard.institutions.map((inst) => (
                          <tr key={inst.id} className="hover:bg-[#0F3D2E]/5">
                            <td className="p-3 font-mono font-bold">{inst.code}</td>
                            <td className="p-3 font-semibold">{inst.name}</td>
                            <td className="p-3">{inst.district}</td>
                            <td className="p-3 font-mono">{inst.university.code}</td>
                            <td className="p-3 font-bold">{inst._count.students}</td>
                            <td className="p-3 font-bold">{inst._count.batches}</td>
                            <td className="p-3"><StatusBadge active={inst.isActive} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider">
                    Recent Audit Activity
                  </div>
                  <div className="divide-y divide-[#0F3D2E]/15 max-h-96 overflow-y-auto">
                    {dashboard.recentAudits.map((a) => (
                      <div key={a.id} className="p-3 text-xs">
                        <p className="font-bold">{a.action}</p>
                        <p className="text-[11px] text-[#0F3D2E]/75">
                          {a.actorEmail} ({a.actorRole})
                        </p>
                        <p className="text-[10px] text-[#0F3D2E]/60 mt-0.5">
                          {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {tab === "search" && (
            <div className="space-y-6">
              <SectionHeader
                title="Search Across Portal"
                subtitle="Find any student, college, university, course, trainer, or batch across Andhra Pradesh"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[260px] max-w-xl">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#0F3D2E]/60" />
                  <input
                    value={globalQuery}
                    onChange={(e) => {
                      setSearchPage(1);
                      runGlobalSearch(e.target.value, searchMode, searchEntity, 1, searchPageSize);
                    }}
                    placeholder="Search Student LMS ID, Univ Reg No, Name, Mobile, Institution Code, Batch, Course..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
                  />
                </div>
                <select
                  value={searchMode}
                  onChange={(e) => {
                    const m = e.target.value as "contains" | "prefix" | "exact";
                    setSearchMode(m);
                    runGlobalSearch(globalQuery, m, searchEntity, 1, searchPageSize);
                  }}
                  className="px-3 py-2.5 text-xs border border-[#0F3D2E]/40 rounded bg-white font-semibold"
                >
                  <option value="contains">Partial Match</option>
                  <option value="prefix">Prefix Search</option>
                  <option value="exact">Exact Match</option>
                </select>
                <select
                  value={searchEntity}
                  onChange={(e) => {
                    setSearchEntity(e.target.value);
                    runGlobalSearch(globalQuery, searchMode, e.target.value, 1, searchPageSize);
                  }}
                  className="px-3 py-2.5 text-xs border border-[#0F3D2E]/40 rounded bg-white font-semibold"
                >
                  <option value="ALL">All Entities</option>
                  <option value="STUDENT">Students</option>
                  <option value="INSTITUTION">Institutions</option>
                  <option value="UNIVERSITY">Universities</option>
                  <option value="COURSE">Courses</option>
                  <option value="TRAINER">Trainers</option>
                  <option value="BATCH">Batches</option>
                  <option value="ADMIN">College Admins</option>
                </select>
                <select
                  value={searchPageSize}
                  onChange={(e) => {
                    const ps = Number(e.target.value);
                    setSearchPageSize(ps);
                    setSearchPage(1);
                    runGlobalSearch(globalQuery, searchMode, searchEntity, 1, ps);
                  }}
                  className="px-3 py-2.5 text-xs border border-[#0F3D2E]/40 rounded bg-white font-semibold"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>

              {searchResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase mb-2">
                      Students &amp; Linked Academic Context ({searchResults.students.length})
                    </p>
                    <div className="divide-y divide-[#0F3D2E]/10">
                      {searchResults.students.map((s) => (
                        <div key={s.id} className="py-2 text-xs flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold mr-2">{s.studentUid}</span>
                            <span className="font-bold mr-2">{s.fullName}</span>
                            <span className="font-mono text-[#0F3D2E]/75">({s.universityRollNo})</span>
                            <p className="text-[11px] text-[#0F3D2E]/75 mt-0.5">
                              Univ: {s.university?.code || "—"} • Inst: {s.institution.name}
                              {s.enrollments && s.enrollments.length > 0
                                ? ` • Batch: ${s.enrollments[0].batch.batchCode} (${s.enrollments[0].batch.course.code}) [${s.enrollments[0].status}]`
                                : " • Not enrolled in a batch"}
                            </p>
                          </div>
                          <StatusBadge active={s.status === "ACTIVE"} activeLabel={s.status} inactiveLabel={s.status} />
                        </div>
                      ))}
                      {searchResults.students.length === 0 && (
                        <p className="text-xs text-[#0F3D2E]/60 py-2">No matching students.</p>
                      )}
                    </div>
                  </div>
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase mb-2">
                      Institutions &amp; Universities ({searchResults.institutions.length + (searchResults.universities?.length || 0)})
                    </p>
                    {searchResults.institutions.map((i) => (
                      <div key={i.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        <span className="font-mono font-bold mr-2">{i.code}</span>
                        {i.name} ({i.district})
                      </div>
                    ))}
                    {(searchResults.universities || []).map((u) => (
                      <div key={u.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        [Univ] <span className="font-mono font-bold mr-2">{u.code}</span>
                        {u.name} ({u.district})
                      </div>
                    ))}
                  </div>
                  <div className="border border-[#0F3D2E]/25 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase mb-2">
                      Courses, Trainers, Batches &amp; Admins ({searchResults.courses.length + searchResults.trainers.length + searchResults.batches.length + (searchResults.admins?.length || 0)})
                    </p>
                    {searchResults.courses.map((c) => (
                      <div key={c.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        [Course] <span className="font-mono font-bold mr-2">{c.code}</span>
                        {c.title}
                      </div>
                    ))}
                    {searchResults.trainers.map((t) => (
                      <div key={t.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        [Trainer] <span className="font-mono font-bold">{t.trainerCode}</span> {t.fullName}
                      </div>
                    ))}
                    {searchResults.batches.map((b) => (
                      <div key={b.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        [Batch] <span className="font-mono font-bold">{b.batchCode}</span> {b.name}
                      </div>
                    ))}
                    {(searchResults.admins || []).map((a) => (
                      <div key={a.id} className="py-1.5 border-b border-[#0F3D2E]/10 text-xs">
                        [Admin] <span className="font-mono font-bold">{a.username || a.email}</span> {a.fullName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {tab === "institutions" && (
            <div className="space-y-6">
              <SectionHeader
                title="Colleges &amp; Institutions"
                subtitle="Add, edit, assign courses, or update status for affiliated colleges across Andhra Pradesh"
              />

              <form onSubmit={createInstitution} className="p-5 border border-[#0F3D2E]/25 rounded-lg space-y-3">
                <p className="text-xs font-bold uppercase">Add New Institution (Institution Master)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input required placeholder="Institution Name" value={newInst.name} onChange={(e) => setNewInst({ ...newInst, name: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input required placeholder="Code (e.g. AP-VSP-009)" value={newInst.code} onChange={(e) => setNewInst({ ...newInst, code: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <select value={newInst.universityId} onChange={(e) => setNewInst({ ...newInst, universityId: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                    ))}
                  </select>
                  <select value={newInst.institutionType} onChange={(e) => setNewInst({ ...newInst, institutionType: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                    <option value="Government College">Government College</option>
                    <option value="Government University">Government University</option>
                    <option value="Private College">Private College</option>
                    <option value="Engineering College">Engineering College</option>
                    <option value="Polytechnic">Polytechnic</option>
                    <option value="Degree College">Degree College</option>
                    <option value="ITI">ITI</option>
                    <option value="Training Institution">Training Institution</option>
                    <option value="Other">Other</option>
                  </select>
                  <input required placeholder="District" value={newInst.district} onChange={(e) => setNewInst({ ...newInst, district: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input placeholder="Mandal" value={newInst.mandal} onChange={(e) => setNewInst({ ...newInst, mandal: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input required placeholder="City" value={newInst.city} onChange={(e) => setNewInst({ ...newInst, city: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input placeholder="Pincode" value={newInst.pincode} onChange={(e) => setNewInst({ ...newInst, pincode: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input placeholder="Principal Name" value={newInst.principalName} onChange={(e) => setNewInst({ ...newInst, principalName: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input placeholder="Contact Person" value={newInst.contactPerson} onChange={(e) => setNewInst({ ...newInst, contactPerson: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <input placeholder="Contact Mobile" value={newInst.contactMobile} onChange={(e) => setNewInst({ ...newInst, contactMobile: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <select value={newInst.status} onChange={(e) => setNewInst({ ...newInst, status: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer">
                  Register Institution
                </button>
              </form>

              <input
                placeholder="Filter institutions by name, code, or district..."
                value={instFilter}
                onChange={(e) => setInstFilter(e.target.value)}
                className="w-full max-w-md px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
              />

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-3 font-bold">Code</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">District</th>
                      <th className="p-3 font-bold">University</th>
                      <th className="p-3 font-bold">Assign Course</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {filteredInstitutions.map((inst) => (
                      <tr key={inst.id} className="hover:bg-[#0F3D2E]/5">
                        <td className="p-3 font-mono font-bold">{inst.code}</td>
                        <td className="p-3 font-semibold">{inst.name}</td>
                        <td className="p-3">{inst.district}</td>
                        <td className="p-3 font-mono">{inst.university.code}</td>
                        <td className="p-3">
                          <select
                            defaultValue=""
                            onChange={(e) => assignCourseToInst(inst.id, e.target.value)}
                            className="px-2 py-1 text-[11px] border border-[#0F3D2E]/40 rounded bg-white"
                          >
                            <option value="">+ Assign course...</option>
                            {courses.filter((c) => c.isActive).map((c) => (
                              <option key={c.id} value={c.id}>{c.code}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3"><StatusBadge active={inst.isActive} /></td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setProvisioningInst({
                                id: inst.id,
                                name: inst.name,
                                code: inst.code,
                                district: inst.district,
                              });
                              setNewAdmin((p) => ({ ...p, institutionId: inst.id, tempPassword: "" }));
                              setProvisionedCreds(null);
                            }}
                            className="px-2.5 py-1 bg-[#0F3D2E] text-white rounded text-[11px] font-semibold hover:bg-[#0A2B20] transition cursor-pointer"
                          >
                            + Create College Admin
                          </button>
                          <button
                            onClick={() => toggleEntityStatus("/api/institutions", inst.id, inst.isActive, inst.name)}
                            className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white transition cursor-pointer"
                          >
                            {inst.isActive ? "Deactivate" : "Restore"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {tab === "universities" && (
            <div className="space-y-6">
              <SectionHeader title="Universities Management" subtitle="Manage affiliating universities across Andhra Pradesh" />
              <form onSubmit={createUniversity} className="p-5 border border-[#0F3D2E]/25 rounded-lg flex flex-wrap gap-3">
                <input required placeholder="University Name" value={newUniv.name} onChange={(e) => setNewUniv({ ...newUniv, name: e.target.value })} className="flex-1 min-w-[220px] px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <input required placeholder="Code (e.g. JNTUGV)" value={newUniv.code} onChange={(e) => setNewUniv({ ...newUniv, code: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <input required placeholder="District" value={newUniv.district} onChange={(e) => setNewUniv({ ...newUniv, district: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <button type="submit" className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer">Add University</button>
              </form>
              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-3 font-bold">Code</th>
                      <th className="p-3 font-bold">University Name</th>
                      <th className="p-3 font-bold">District</th>
                      <th className="p-3 font-bold">Colleges</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {universities.map((u) => (
                      <tr key={u.id}>
                        <td className="p-3 font-mono font-bold">{u.code}</td>
                        <td className="p-3 font-semibold">{u.name}</td>
                        <td className="p-3">{u.district}</td>
                        <td className="p-3 font-bold">{u._count.institutions}</td>
                        <td className="p-3"><StatusBadge active={u.isActive} /></td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => toggleEntityStatus("/api/universities", u.id, u.isActive, u.code)}
                            className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                          >
                            {u.isActive ? "Deactivate" : "Restore"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {tab === "admins" && (
            <div className="space-y-6">
              <SectionHeader title="College Administrators" subtitle="Create and manage login accounts for college coordinators" />
              <form onSubmit={(e) => createCollegeAdmin(e, true)} className="p-5 border border-[#0F3D2E]/25 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required placeholder="Full Name" value={newAdmin.fullName} onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <input required type="email" placeholder="Official Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <select value={newAdmin.institutionId} onChange={(e) => setNewAdmin({ ...newAdmin, institutionId: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                  ))}
                </select>
                <input placeholder="Temporary Password (blank = auto-generate)" value={newAdmin.tempPassword} onChange={(e) => setNewAdmin({ ...newAdmin, tempPassword: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <input placeholder="Designation" value={newAdmin.designation} onChange={(e) => setNewAdmin({ ...newAdmin, designation: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                <button type="submit" className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer">Generate &amp; Activate Admin</button>
              </form>

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-3 font-bold">Admin Username</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Institution ID</th>
                      <th className="p-3 font-bold">Temp Reset</th>
                      <th className="p-3 font-bold">Account Status</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {admins.map((a) => (
                      <tr key={a.id}>
                        <td className="p-3 font-mono font-bold">{a.username || "—"}</td>
                        <td className="p-3 font-semibold">{a.fullName}</td>
                        <td className="p-3 font-mono">{a.email}</td>
                        <td className="p-3">{a.institution?.code} — {a.institution?.name}</td>
                        <td className="p-3">{a.mustChangePassword ? "Pending Reset" : "Verified"}</td>
                        <td className="p-3"><StatusBadge active={a.isActive} activeLabel="Active" inactiveLabel="Inactive" /></td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => resetAdminPassword(a.id, a.email)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" /> Generate Temp Pass
                          </button>
                          <button
                            onClick={() => toggleEntityStatus("/api/admins", a.id, a.isActive, a.username || a.email)}
                            className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                          >
                            {a.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {tab === "courses_trainers" && (
            <div className="space-y-6">
              <SectionHeader title="Courses & Trainers Catalog" subtitle="Manage statewide skill development courses and certified trainers" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={createCourse} className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-3">
                  <p className="text-xs font-bold uppercase">Add Course</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Code (APSD-XX-107)" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                    <input required placeholder="Sector" value={newCourse.sector} onChange={(e) => setNewCourse({ ...newCourse, sector: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  </div>
                  <input required placeholder="Course Title" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} className="w-full px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Hours" value={newCourse.durationHours} onChange={(e) => setNewCourse({ ...newCourse, durationHours: Number(e.target.value) })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                    <select value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                      <option value="FOUNDATION">FOUNDATION</option>
                      <option value="INTERMEDIATE">INTERMEDIATE</option>
                      <option value="ADVANCED">ADVANCED</option>
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer">Create Course</button>
                </form>

                <form onSubmit={createTrainer} className="p-4 border border-[#0F3D2E]/25 rounded-lg space-y-3">
                  <p className="text-xs font-bold uppercase">Add Trainer</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Trainer Code (TRN-AP-006)" value={newTrainer.trainerCode} onChange={(e) => setNewTrainer({ ...newTrainer, trainerCode: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                    <input required placeholder="Full Name" value={newTrainer.fullName} onChange={(e) => setNewTrainer({ ...newTrainer, fullName: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="email" placeholder="Email" value={newTrainer.email} onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                    <input required placeholder="Specialization" value={newTrainer.specialization} onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  </div>
                  <input placeholder="Qualification" value={newTrainer.qualification} onChange={(e) => setNewTrainer({ ...newTrainer, qualification: e.target.value })} className="w-full px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded" />
                  <button type="submit" className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer">Add Trainer</button>
                </form>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0F3D2E] text-white text-xs font-bold">Courses ({courses.length})</div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {courses.map((c) => (
                      <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold">{c.code} — {c.title}</p>
                          <p className="text-[#0F3D2E]/70">{c.sector} • {c.durationHours}h</p>
                        </div>
                        <button onClick={() => toggleEntityStatus("/api/courses", c.id, c.isActive, c.code)} className="px-2 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold cursor-pointer">
                          {c.isActive ? "Deactivate" : "Restore"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0F3D2E] text-white text-xs font-bold">Trainers ({trainers.length})</div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {trainers.map((t) => (
                      <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold">{t.trainerCode} — {t.fullName}</p>
                          <p className="text-[#0F3D2E]/70">{t.specialization} • {t._count.batches} batches</p>
                        </div>
                        <button onClick={() => toggleEntityStatus("/api/trainers", t.id, t.isActive, t.fullName)} className="px-2 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold cursor-pointer">
                          {t.isActive ? "Deactivate" : "Restore"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {tab === "batches_monitor" && (
            <div className="space-y-6">
              <SectionHeader title="Batches & Trainer Assignment" subtitle="Monitor statewide batches, enrollments, and assign trainers" />
              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-3 font-bold">Batch Code</th>
                      <th className="p-3 font-bold">Institution</th>
                      <th className="p-3 font-bold">Course</th>
                      <th className="p-3 font-bold">Enrolled</th>
                      <th className="p-3 font-bold">Assign Trainer</th>
                      <th className="p-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td className="p-3 font-mono font-bold">
                          <button
                            onClick={() => setSelectedBatchId(b.id)}
                            className="underline hover:opacity-75 cursor-pointer"
                          >
                            {b.batchCode}
                          </button>
                        </td>
                        <td className="p-3">{b.institution.code} — {b.institution.name}</td>
                        <td className="p-3">{b.course.code}</td>
                        <td className="p-3 font-bold">{b.enrollments.length}</td>
                        <td className="p-3">
                          <select
                            value={b.trainer?.id || ""}
                            onChange={(e) => assignTrainerToBatch(b.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-[#0F3D2E]/40 rounded bg-white"
                          >
                            <option value="">Unassigned</option>
                            {trainers.filter((t) => t.isActive).map((t) => (
                              <option key={t.id} value={t.id}>{t.trainerCode} — {t.fullName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3"><StatusBadge active={b.isActive} activeLabel={b.status} inactiveLabel="Inactive" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {tab === "students" && (
            <div className="space-y-6">
              <SectionHeader
                title="Statewide Students"
                subtitle="View, search, and manage all registered students across Andhra Pradesh"
                action={
                  selectedStudentIds.length > 0 ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch("/api/bulk", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "BULK_STATUS_UPDATE", studentIds: selectedStudentIds, isActive: false }),
                          });
                          setNotice(`Bulk deactivated ${selectedStudentIds.length} students.`);
                          setSelectedStudentIds([]);
                          loadCoreLists();
                        }}
                        className="px-3 py-1.5 border border-[#0F3D2E] text-xs font-bold rounded cursor-pointer"
                      >
                        Bulk Deactivate ({selectedStudentIds.length})
                      </button>
                      <button
                        onClick={async () => {
                          await fetch("/api/bulk", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "BULK_STATUS_UPDATE", studentIds: selectedStudentIds, isActive: true }),
                          });
                          setNotice(`Bulk restored ${selectedStudentIds.length} students.`);
                          setSelectedStudentIds([]);
                          loadCoreLists();
                        }}
                        className="px-3 py-1.5 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer"
                      >
                        Bulk Restore ({selectedStudentIds.length})
                      </button>
                    </div>
                  ) : undefined
                }
              />
              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F3D2E] text-white">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedStudentIds.length === students.length}
                          onChange={(e) =>
                            setSelectedStudentIds(e.target.checked ? students.map((s) => s.id) : [])
                          }
                        />
                      </th>
                      <th className="p-3 font-bold">AP Student UID</th>
                      <th className="p-3 font-bold">Univ Roll No</th>
                      <th className="p-3 font-bold">Full Name</th>
                      <th className="p-3 font-bold">Institution</th>
                      <th className="p-3 font-bold">Branch</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D2E]/15">
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={(e) =>
                              setSelectedStudentIds((prev) =>
                                e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                              )
                            }
                          />
                        </td>
                        <td className="p-3 font-mono font-bold">{s.studentUid}</td>
                        <td className="p-3 font-mono">{s.universityRollNo}</td>
                        <td className="p-3 font-semibold">{s.fullName}</td>
                        <td className="p-3">{s.institution.code} — {s.institution.name}</td>
                        <td className="p-3">{s.branch} • Y{s.yearOfStudy}</td>
                        <td className="p-3"><StatusBadge active={s.isActive} /></td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedStudentId(s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F3D2E] text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => toggleEntityStatus("/api/students", s.id, s.isActive, s.fullName)}
                            className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
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
          )}

          {tab === "import_students" && (
            <ImportStudentsPanel
              onImported={() => {
                loadCoreLists();
                loadDashboard();
              }}
            />
          )}

          {tab === "notifications" && (
            <NotificationCenterPanel onUnreadChange={setUnreadNotifications} />
          )}

          {tab === "reports" && (
            <div className="space-y-6">
              <SectionHeader
                title="Reports &amp; Downloads"
                subtitle="Select a report and date range to view or download in CSV, Excel, or PDF format"
              />
              <div className="flex flex-wrap items-center gap-3 p-4 border border-[#0F3D2E]/25 rounded-lg">
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white font-semibold">
                  <option value="institution">Institution Report</option>
                  <option value="university">University Report</option>
                  <option value="district">District Report</option>
                  <option value="students">Student Report</option>
                  <option value="course">Course Report</option>
                  <option value="batches">Batch Report</option>
                  <option value="trainer">Trainer Report</option>
                  <option value="attendance">Attendance Report</option>
                  <option value="enrollment">Enrollment Report</option>
                  <option value="completion">Completion Report</option>
                  <option value="certificate">Certificate Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="quarterly">Quarterly Report</option>
                  <option value="half_yearly">Half-Yearly Report</option>
                  <option value="annual">Annual Report</option>
                </select>
                <select value={reportInstId} onChange={(e) => setReportInstId(e.target.value)} className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white">
                  <option value="ALL">All Institutions (Statewide)</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                  ))}
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
                <a
                  href={`/api/reports?type=${reportType}&institutionId=${reportInstId}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=csv`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20]"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </a>
                <a
                  href={`/api/reports?type=${reportType}&institutionId=${reportInstId}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=excel`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </a>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/reports?type=${reportType}&institutionId=${reportInstId}&datePreset=${datePreset}&startDate=${customStart}&endDate=${customEnd}&format=pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white"
                >
                  Print / PDF
                </a>
              </div>

              {reportPreview && (
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0F3D2E] text-white text-xs font-bold flex justify-between">
                    <span>{reportPreview.title}</span>
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

          {tab === "rbac" && <RbacManagementPanel />}

          {tab === "governance" && governance && (
            <div className="space-y-6">
              <SectionHeader title="System Configurations, RBAC Permissions & Audit Logs" subtitle="Central governance controls and immutable audit trail" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase">System Configurations</div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {governance.configs.map((cfg) => (
                      <div key={cfg.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-mono font-bold">{cfg.key}</p>
                          <p className="text-[11px] text-[#0F3D2E]/70">{cfg.description}</p>
                        </div>
                        <input
                          defaultValue={cfg.value}
                          onBlur={(e) => {
                            if (e.target.value !== cfg.value) updateConfig(cfg.key, e.target.value);
                          }}
                          className="w-40 px-2.5 py-1 text-xs border border-[#0F3D2E]/40 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase">Role Access Permissions</div>
                  <div className="divide-y divide-[#0F3D2E]/15">
                    {governance.permissions.map((perm) => (
                      <div key={perm.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold">[{perm.role.key}] {perm.permission.key}</p>
                          <p className="text-[11px] text-[#0F3D2E]/70">{perm.permission.label}</p>
                        </div>
                        <button
                          onClick={() => togglePermission(perm.id, perm.enabled)}
                          className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer ${
                            perm.enabled ? "bg-[#0F3D2E] text-white" : "border border-[#0F3D2E] text-[#0F3D2E]"
                          }`}
                        >
                          {perm.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase">Audit Logs (Latest 100)</div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/15">
                      <tr>
                        <th className="p-2.5 font-bold">Timestamp</th>
                        <th className="p-2.5 font-bold">Actor</th>
                        <th className="p-2.5 font-bold">Action</th>
                        <th className="p-2.5 font-bold">Entity</th>
                        <th className="p-2.5 font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0F3D2E]/10">
                      {governance.auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="p-2.5 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="p-2.5">{log.actorEmail} ({log.actorRole})</td>
                          <td className="p-2.5 font-mono font-bold">{log.action}</td>
                          <td className="p-2.5">{log.entityType}</td>
                          <td className="p-2.5 font-mono text-[11px]">{log.detailsJson}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {tab === "profile" && (
            <ProfilePanel user={user} onRefreshUser={onRefreshUser} />
          )}

          {/* Selected Institution -> Create College Admin Modal */}
          {provisioningInst && (
            <div className="fixed inset-0 z-50 bg-[#0F3D2E]/60 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white border-2 border-[#0F3D2E] rounded-lg shadow-2xl overflow-hidden text-[#0F3D2E]">
                <div className="px-5 py-3.5 bg-[#0F3D2E] text-white flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">
                      College Admin Provisioning
                    </p>
                    <h3 className="text-sm font-bold">
                      {provisioningInst.name} ({provisioningInst.code})
                    </h3>
                  </div>
                  <button
                    onClick={() => setProvisioningInst(null)}
                    className="px-2.5 py-1 border border-white/40 rounded text-xs font-bold hover:bg-white hover:text-[#0F3D2E] cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {!provisionedCreds ? (
                    <form onSubmit={(e) => createCollegeAdmin(e, false)} className="space-y-3">
                      <div className="p-3 rounded border border-[#0F3D2E]/25 bg-[#0F3D2E]/5 text-xs">
                        <p className="font-bold">Institution ID: <span className="font-mono">{provisioningInst.code}</span></p>
                        <p className="text-[11px] text-[#0F3D2E]/75">
                          Admin Username (e.g. <span className="font-mono font-bold">ADM-{provisioningInst.code}</span>) and secure Temporary Password will be system-generated on save.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          required
                          placeholder="Admin Full Name"
                          value={newAdmin.fullName}
                          onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                          className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                        />
                        <input
                          required
                          type="email"
                          placeholder="Official Email"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                          className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                        />
                        <input
                          placeholder="Phone Number"
                          value={newAdmin.phone}
                          onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                          className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                        />
                        <input
                          placeholder="Designation"
                          value={newAdmin.designation}
                          onChange={(e) => setNewAdmin({ ...newAdmin, designation: e.target.value })}
                          className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 border border-[#0F3D2E] text-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E]/5 cursor-pointer"
                        >
                          Generate Credentials &amp; Save (Pending)
                        </button>
                        <button
                          type="button"
                          onClick={(e) => createCollegeAdmin(e as unknown as React.FormEvent, true)}
                          className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] cursor-pointer"
                        >
                          Generate, Save &amp; Activate
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 border-2 border-[#0F3D2E] rounded-lg bg-[#0F3D2E]/5 space-y-2 text-xs">
                        <p className="font-bold uppercase tracking-wider text-[11px]">
                          Generated College Admin Credentials
                        </p>
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <span className="text-[#0F3D2E]/75">Institution ID:</span>
                          <span className="font-bold">{provisionedCreds.institutionCode}</span>
                          <span className="text-[#0F3D2E]/75">Admin Username:</span>
                          <span className="font-bold">{provisionedCreds.username}</span>
                          <span className="text-[#0F3D2E]/75">Temporary Password:</span>
                          <span className="font-bold">{provisionedCreds.tempPassword}</span>
                          <span className="text-[#0F3D2E]/75">Account Status:</span>
                          <span className="font-bold">{provisionedCreds.accountStatus}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {provisionedCreds.accountStatus !== "ACTIVE" && (
                          <button
                            onClick={() => activateProvisionedAdmin(provisionedCreds.adminId)}
                            className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] cursor-pointer"
                          >
                            Activate Account Now
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              `Institution ID: ${provisionedCreds.institutionCode}\nAdmin Username: ${provisionedCreds.username}\nTemporary Password: ${provisionedCreds.tempPassword}`
                            );
                            setNotice("Credentials copied to clipboard.");
                          }}
                          className="px-4 py-2 border border-[#0F3D2E] text-xs font-bold rounded hover:bg-[#0F3D2E] hover:text-white cursor-pointer"
                        >
                          Copy Credentials
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0F3D2E] text-white border-t border-white/20 grid grid-cols-5">
        {[
          { id: "overview" as SuperTab, label: "Home", icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: "search" as SuperTab, label: "Search", icon: <Search className="w-4 h-4" /> },
          { id: "institutions" as SuperTab, label: "Colleges", icon: <Building2 className="w-4 h-4" /> },
          { id: "students" as SuperTab, label: "Students", icon: <Users className="w-4 h-4" /> },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-bold cursor-pointer ${
              tab === item.id ? "bg-white text-[#0F3D2E]" : "text-white/90"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-bold text-white/90 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
