"use client";

import React, { useState } from "react";
import { KeyRound, ShieldAlert, LogOut, CheckCircle2, Circle } from "lucide-react";

export function ForcePasswordModal({
  userEmail,
  onSuccess,
  onLogout,
}: {
  userEmail: string;
  onSuccess: () => void;
  onLogout: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = [
    { label: "Minimum 8 characters", ok: newPassword.length >= 8 },
    { label: "Uppercase letter (A-Z)", ok: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter (a-z)", ok: /[a-z]/.test(newPassword) },
    { label: "Number (0-9)", ok: /[0-9]/.test(newPassword) },
    { label: "Special character (!@#$...)", ok: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const allValid = checks.every((c) => c.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!allValid) {
      setError("New password must satisfy all complexity requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from your temporary password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error while updating password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F3D2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-white rounded-lg shadow-2xl p-8 text-[#0F3D2E]">
        <div className="flex items-center gap-3 pb-4 border-b border-[#0F3D2E]/20">
          <div className="p-2.5 rounded-md bg-[#0F3D2E] text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D2E]/70">
              Change Temporary Password
            </p>
            <h1 className="text-lg font-bold tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs text-[#0F3D2E]/75">{userEmail}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#0F3D2E]/90">
          For your account security, please replace your temporary password with
          a new password before entering your college portal.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded border border-[#0F3D2E] bg-[#0F3D2E]/5 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
              Current Temporary Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
              placeholder="Enter temporary password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
              placeholder="Enter new strong password"
            />
          </div>

          <div className="p-3 rounded border border-[#0F3D2E]/20 bg-[#0F3D2E]/5 space-y-1">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-[11px] font-medium">
                {c.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0F3D2E]" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-[#0F3D2E]/40" />
                )}
                <span className={c.ok ? "font-bold" : "opacity-75"}>{c.label}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E]"
              placeholder="Re-enter new password"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0F3D2E] text-white text-sm font-semibold rounded hover:bg-[#0A2B20] transition disabled:opacity-60 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? "Updating..." : "Save & Access Dashboard"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-3 border border-[#0F3D2E] text-[#0F3D2E] text-sm font-semibold rounded hover:bg-[#0F3D2E]/5 transition cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
