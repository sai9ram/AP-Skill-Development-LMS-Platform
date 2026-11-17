"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Shield, Plus, Users, CheckSquare, Square } from "lucide-react";
import { NoticeBanner, SectionHeader, StatusBadge } from "./ui/SharedUI";

interface RoleItem {
  id: string;
  key: string;
  name: string;
  description: string;
  scope: string;
  hierarchyLevel: number;
  isSystem: boolean;
  isActive: boolean;
  rolePermissions: Array<{
    id: string;
    enabled: boolean;
    permission: { id: string; key: string; label: string; module: string };
  }>;
  _count: { userRoles: number };
}

interface PermItem {
  id: string;
  key: string;
  module: string;
  label: string;
  description: string;
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  institution: { code: string; name: string } | null;
  userRoles: Array<{
    id: string;
    role: { id: string; key: string; name: string; scope: string };
  }>;
}

export function RbacManagementPanel() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [notice, setNotice] = useState("");

  // New Role form
  const [newRole, setNewRole] = useState({
    key: "",
    name: "",
    description: "",
    scope: "INSTITUTION",
    hierarchyLevel: 4,
  });

  // User Role assignment
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");

  const loadRbac = useCallback(async () => {
    const res = await fetch("/api/rbac");
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setUsers(data.users || []);
      if (data.roles?.length && !selectedRoleId) {
        setSelectedRoleId(data.roles[0].id);
      }
      if (data.users?.length && !assignUserId) {
        setAssignUserId(data.users[0].id);
      }
      if (data.roles?.length && !assignRoleId) {
        setAssignRoleId(data.roles[0].id);
      }
    }
  }, [selectedRoleId, assignUserId, assignRoleId]);

  useEffect(() => {
    loadRbac();
  }, [loadRbac]);

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/rbac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_ROLE", ...newRole }),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Failed to create role");
    else {
      setNotice(`Role ${d.role.key} created dynamically.`);
      setNewRole({ key: "", name: "", description: "", scope: "INSTITUTION", hierarchyLevel: 4 });
      loadRbac();
    }
  }

  async function toggleRolePermission(roleId: string, permissionId: string, currentlyEnabled: boolean) {
    const res = await fetch("/api/rbac", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_ROLE_PERMISSION",
        roleId,
        permissionId,
        enabled: !currentlyEnabled,
      }),
    });
    if (res.ok) {
      setNotice("Role permission matrix updated.");
      loadRbac();
    }
  }

  async function toggleRoleActive(roleId: string) {
    const res = await fetch("/api/rbac", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE_ROLE_ACTIVE", roleId }),
    });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || "Cannot update role");
    else {
      setNotice(`Role ${d.role.key} ${d.role.isActive ? "activated" : "deactivated"}.`);
      loadRbac();
    }
  }

  async function handleAssignUserRole(e: React.FormEvent) {
    e.preventDefault();
    if (!assignUserId || !assignRoleId) return;
    const res = await fetch("/api/rbac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ASSIGN_USER_ROLE",
        userId: assignUserId,
        roleId: assignRoleId,
      }),
    });
    if (res.ok) {
      setNotice("User role assigned.");
      loadRbac();
    }
  }

  async function handleRevokeUserRole(userId: string, roleId: string) {
    const res = await fetch("/api/rbac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REVOKE_USER_ROLE", userId, roleId }),
    });
    if (res.ok) {
      setNotice("User role revoked.");
      loadRbac();
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const enabledPermIds = new Set(
    selectedRole?.rolePermissions.filter((rp) => rp.enabled).map((rp) => rp.permission.id) || []
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Roles &amp; Access Permissions"
        subtitle="Manage user roles and choose what each role can view or edit in the portal"
      />

      <NoticeBanner message={notice} onClose={() => setNotice("")} />

      {/* Hierarchy Tree Visualization */}
      <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" /> AP Skill Development Role Hierarchy
        </div>
        <div className="p-5 bg-white grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="font-mono text-xs space-y-1.5 border-l-2 border-[#0F3D2E] pl-4">
            <p className="font-bold text-sm">SUPER ADMIN (Level 1 • Statewide)</p>
            <p className="pl-4">├── State / Central LMS Management</p>
            <p className="pl-4">├── Universities Registry</p>
            <p className="pl-4">├── Institutions / Colleges (800-Scale)</p>
            <p className="pl-4">└── College Admin (Level 4 • Institution Isolated)</p>
            <p className="pl-10">├── Students</p>
            <p className="pl-10">├── Batches</p>
            <p className="pl-10">├── Courses</p>
            <p className="pl-10">├── Attendance</p>
            <p className="pl-10">└── Reports</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider">
              Configured Roles in Database ({roles.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition ${
                    selectedRoleId === r.id
                      ? "bg-[#0F3D2E] text-white border-[#0F3D2E]"
                      : "bg-white text-[#0F3D2E] border-[#0F3D2E]/30 hover:border-[#0F3D2E]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-current">
                      L{r.hierarchyLevel} • {r.scope}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-1">
                    {r.rolePermissions.filter((rp) => rp.enabled).length} perms • {r._count.userRoles} users
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create New Role */}
      <form
        onSubmit={handleCreateRole}
        className="p-5 border border-[#0F3D2E]/25 rounded-lg space-y-3"
      >
        <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add a New Role
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            required
            placeholder="Role Key (e.g. REGIONAL_AUDITOR)"
            value={newRole.key}
            onChange={(e) => setNewRole({ ...newRole, key: e.target.value })}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
          />
          <input
            required
            placeholder="Display Name"
            value={newRole.name}
            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
          />
          <select
            value={newRole.scope}
            onChange={(e) => setNewRole({ ...newRole, scope: e.target.value })}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
          >
            <option value="STATEWIDE">STATEWIDE</option>
            <option value="DISTRICT">DISTRICT</option>
            <option value="INSTITUTION">INSTITUTION</option>
            <option value="BATCH">BATCH</option>
          </select>
          <select
            value={newRole.hierarchyLevel}
            onChange={(e) => setNewRole({ ...newRole, hierarchyLevel: Number(e.target.value) })}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
          >
            <option value={2}>Level 2 (State/Audit)</option>
            <option value={3}>Level 3 (District)</option>
            <option value={4}>Level 4 (Institution)</option>
            <option value={5}>Level 5 (Batch/Trainer)</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded hover:bg-[#0A2B20] cursor-pointer"
          >
            Create Role
          </button>
        </div>
        <input
          placeholder="Role description..."
          value={newRole.description}
          onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
          className="w-full px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded"
        />
      </form>

      {/* Role-Permission Matrix */}
      {selectedRole && (
        <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#0F3D2E] text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider">
                Permissions for {selectedRole.name} ({selectedRole.key})
              </span>
              <span className="ml-2 text-white/75">— {selectedRole.description}</span>
            </div>
            {!selectedRole.isSystem && (
              <button
                onClick={() => toggleRoleActive(selectedRole.id)}
                className="px-2.5 py-1 border border-white rounded text-[11px] font-bold hover:bg-white hover:text-[#0F3D2E] cursor-pointer"
              >
                {selectedRole.isActive ? "Deactivate Role" : "Restore Role"}
              </button>
            )}
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {permissions.map((perm) => {
              const isEnabled = enabledPermIds.has(perm.id);
              return (
                <button
                  key={perm.id}
                  type="button"
                  onClick={() => toggleRolePermission(selectedRole.id, perm.id, isEnabled)}
                  className={`flex items-start gap-2.5 p-3 rounded border text-left text-xs transition cursor-pointer ${
                    isEnabled
                      ? "border-[#0F3D2E] bg-[#0F3D2E]/5"
                      : "border-[#0F3D2E]/20 bg-white opacity-75"
                  }`}
                >
                  {isEnabled ? (
                    <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-[#0F3D2E]" />
                  ) : (
                    <Square className="w-4 h-4 shrink-0 mt-0.5 text-[#0F3D2E]/50" />
                  )}
                  <div>
                    <p className="font-bold">{perm.label}</p>
                    <p className="font-mono text-[10px] text-[#0F3D2E]/70">
                      [{perm.module}] {perm.key}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* User-Role Assignments (user_roles) */}
      <div className="border border-[#0F3D2E]/25 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#0F3D2E] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" /> Assign Roles to Staff
        </div>
        <form
          onSubmit={handleAssignUserRole}
          className="p-4 border-b border-[#0F3D2E]/15 flex flex-wrap items-center gap-3"
        >
          <select
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white min-w-[240px]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </select>
          <select
            value={assignRoleId}
            onChange={(e) => setAssignRoleId(e.target.value)}
            className="px-3 py-2 text-xs border border-[#0F3D2E]/40 rounded bg-white"
          >
            {roles.filter((r) => r.isActive).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.scope})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer"
          >
            Assign Role to User
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F3D2E]/5 border-b border-[#0F3D2E]/15">
              <tr>
                <th className="p-3 font-bold">User</th>
                <th className="p-3 font-bold">Email</th>
                <th className="p-3 font-bold">Institution</th>
                <th className="p-3 font-bold">Assigned Roles</th>
                <th className="p-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F3D2E]/10">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3 font-semibold">{u.fullName}</td>
                  <td className="p-3 font-mono">{u.email}</td>
                  <td className="p-3">{u.institution ? `${u.institution.code}` : "Statewide"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.userRoles.map((ur) => (
                        <span
                          key={ur.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0F3D2E] text-white text-[10px] font-bold"
                        >
                          {ur.role.key}
                          {u.userRoles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRevokeUserRole(u.id, ur.role.id)}
                              className="hover:underline cursor-pointer"
                              title="Revoke role"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge active={u.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
