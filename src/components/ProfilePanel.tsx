"use client";

import React, { useState } from "react";
import { CurrentUser, NoticeBanner, SectionHeader } from "./ui/SharedUI";
import { KeyRound, Save, UserCheck } from "lucide-react";

export function ProfilePanel({
  user,
  onRefreshUser,
}: {
  user: CurrentUser;
  onRefreshUser: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || "");
  const [designation, setDesignation] = useState(user.designation || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, designation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "Failed to update profile");
      } else {
        setNotice("Profile updated successfully.");
        onRefreshUser();
      }
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    if (newPassword.length < 8) {
      setNotice("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "Password update failed");
      } else {
        setNotice("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Profile & Account Security"
        subtitle="Manage your personal administrator details and credentials"
      />

      <NoticeBanner message={notice} onClose={() => setNotice("")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={saveProfile}
          className="bg-white border border-[#0F3D2E]/25 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#0F3D2E]/15">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-bold text-base">Administrator Profile</h3>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Official Email (Immutable)
            </label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/20 rounded bg-[#0F3D2E]/5 text-[#0F3D2E]/80"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F3D2E] text-white text-sm font-semibold rounded hover:bg-[#0A2B20] transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </form>

        <form
          onSubmit={changePassword}
          className="bg-white border border-[#0F3D2E]/25 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#0F3D2E]/15">
            <KeyRound className="w-5 h-5" />
            <h3 className="font-bold text-base">Change Password</h3>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F3D2E] text-white text-sm font-semibold rounded hover:bg-[#0A2B20] transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
